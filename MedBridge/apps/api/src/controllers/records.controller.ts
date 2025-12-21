import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@medbridge/db";
import { useInMemoryStore, visionEnabled } from "../lib/config";
import { ocrTextFromImageBytes } from "../lib/vision";
import { summarizeForClinician } from "../lib/gemini";
import { parseMedCandidates } from "../lib/meds";
import { isAuthEnabled } from "../lib/auth";
import { memAddRecord, memGetRecords } from "../lib/memory";
import { extractMedicationsFromImage, isGeminiOcrEnabled } from "../lib/genaiOcr";

function requireAuth(req: Request) {
  if (!isAuthEnabled()) return;
  if (!req.session?.user) throw new UnauthorizedException("unauthorized");
}

function ensureDbConfigured() {
  if (useInMemoryStore) return;
  if (!process.env.DATABASE_URL) {
    throw new ServiceUnavailableException({
      error: "db_not_configured",
      hint: "Set DATABASE_URL",
    });
  }
}

@Controller()
export class RecordsController {
  // Record count for patient (default last 90 days)
  @Get("/api/records/count")
  async count(@Req() req: Request, @Query() query: unknown) {
    ensureDbConfigured();
    requireAuth(req);

    const parsed = z
      .object({
        patientId: z.string().uuid(),
        days: z.coerce.number().int().positive().max(3650).optional(),
      })
      .safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException({
        error: "invalid_query",
        details: parsed.error.flatten(),
      });
    }

    const days = parsed.data.days ?? 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    if (useInMemoryStore) {
      const records = memGetRecords(parsed.data.patientId);
      const count = records.filter((r) => r.createdAt >= since).length;
      return { count, since, days };
    }

    const count = await prisma.prescriptionRecord.count({
      where: {
        patientId: parsed.data.patientId,
        createdAt: { gte: since },
      },
    });
    return { count, since, days };
  }

  // OCR Preview (no DB write)
  @Post("/api/records/preview-ocr")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async previewOcr(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException("file_required");

    const buf = file.buffer;
    let text = "";
    let overallConfidence: number | null = null;
    let hospitalName: string | null = null;
    let patientCondition: string | null = null;
    let medicationsDetailed:
      | Array<{
          medicationName: string;
          dose: string | null;
          frequency: string | null;
          duration: string | null;
          prescriptionDate: string | null;
          dispensingDate: string | null;
          confidence: number;
          ingredients: string | null;
          indication: string | null;
          dosesPerDay: number | null;
          totalDoses: number | null;
        }>
      | null = null;

    // Prefer Gemini multimodal extraction if enabled (AS-IS behavior)
    if (isGeminiOcrEnabled()) {
      const r = await extractMedicationsFromImage(buf, file.mimetype || "image/jpeg");
      text = r.rawText ?? "";
      overallConfidence = null;
      hospitalName = r.hospitalName ?? null;
      patientCondition = r.patientCondition ?? null;
      medicationsDetailed = r.medications.map((m) => ({
        medicationName: m.medicationName,
        dose: m.dose ?? null,
        frequency: m.frequency ?? null,
        duration: m.duration ?? null,
        prescriptionDate: m.prescriptionDate ?? null,
        dispensingDate: m.dispensingDate ?? null,
        confidence: m.confidence,
        ingredients: m.ingredients ?? null,
        indication: m.indication ?? null,
        dosesPerDay: m.dosesPerDay ?? null,
        totalDoses: m.totalDoses ?? null,
      }));
    } else if (useInMemoryStore && !visionEnabled) {
      text =
        "OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.";
      overallConfidence = null;
    } else {
      try {
        const r = await ocrTextFromImageBytes(buf);
        text = r.text;
        overallConfidence = r.overallConfidence;
      } catch (e) {
        if (useInMemoryStore) {
          text =
            "OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.";
          overallConfidence = null;
        } else {
          throw new ServiceUnavailableException({
            error: "ocr_unavailable",
            hint: "Configure Google Cloud Vision credentials (ADC / GOOGLE_APPLICATION_CREDENTIALS).",
            details: String((e as any)?.message ?? e),
          });
        }
      }
    }

    const meds = medicationsDetailed
      ? medicationsDetailed.map((m) => m.medicationName).filter(Boolean)
      : parseMedCandidates(text);
    return {
      rawText: text,
      overallConfidence,
      meds: meds.map((nameRaw) => ({ nameRaw, confidence: null })),
      hospitalName,
      patientCondition,
      medications: medicationsDetailed,
    };
  }

  // Create record with OCR + DB write (no image storage)
  @Post("/api/records")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async createRecord(
    @Req() req: Request,
    @Query() query: unknown,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    ensureDbConfigured();
    requireAuth(req);
    if (!file?.buffer) throw new BadRequestException("file_required");

    const meta = z
      .object({
        patientId: z.string().uuid(),
        recordType: z.enum(["dispensing_record", "prescription"]),
        facilityName: z.string().min(1).max(200).optional(),
        facilityType: z
          .enum(["clinic", "hospital", "pharmacy", "unknown"])
          .optional(),
        chiefComplaint: z.string().max(200).optional(),
        doctorDiagnosis: z.string().max(200).optional(),
        noteDoctorSaid: z.string().max(500).optional(),
        prescribedAt: z.string().datetime().optional(),
        dispensedAt: z.string().datetime().optional(),
      })
      .safeParse(query);

    if (!meta.success) {
      throw new BadRequestException({
        error: "invalid_meta",
        details: meta.error.flatten(),
      });
    }

    const buf = file.buffer;
    let text = "";
    if (useInMemoryStore && !visionEnabled) {
      text =
        "OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.";
    } else {
      try {
        const r = await ocrTextFromImageBytes(buf);
        text = r.text;
      } catch (e) {
        if (useInMemoryStore) {
          text =
            "OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.";
        } else {
          throw new ServiceUnavailableException({
            error: "ocr_unavailable",
            hint: "Configure Google Cloud Vision credentials (ADC / GOOGLE_APPLICATION_CREDENTIALS).",
            details: String((e as any)?.message ?? e),
          });
        }
      }
    }

    const meds = parseMedCandidates(text);
    const geminiSummary = await summarizeForClinician(text);

    if (useInMemoryStore) {
      const recordId = crypto.randomUUID();
      memAddRecord({
        id: recordId,
        patientId: meta.data.patientId,
        recordType: meta.data.recordType,
        createdAt: new Date(),
        chiefComplaint: meta.data.chiefComplaint,
        doctorDiagnosis: meta.data.doctorDiagnosis,
        noteDoctorSaid: meta.data.noteDoctorSaid,
        meds: meds.map((nameRaw) => ({ nameRaw, needsVerification: false })),
        rawText: text,
        geminiSummary,
      });
      return { recordId, createdAt: new Date() };
    }

    const patient = await prisma.patient.upsert({
      where: { id: meta.data.patientId },
      update: {},
      create: { id: meta.data.patientId },
    });

    let facilityId: string | null = null;
    if (meta.data.facilityName) {
      const facility = await prisma.facility.create({
        data: {
          name: meta.data.facilityName,
          type: meta.data.facilityType ?? "unknown",
        },
      });
      facilityId = facility.id;
    }

    const record = await prisma.prescriptionRecord.create({
      data: {
        patientId: patient.id,
        facilityId,
        recordType: meta.data.recordType,
        chiefComplaint: meta.data.chiefComplaint,
        doctorDiagnosis: meta.data.doctorDiagnosis,
        noteDoctorSaid: meta.data.noteDoctorSaid,
        prescribedAt: meta.data.prescribedAt
          ? new Date(meta.data.prescribedAt)
          : undefined,
        dispensedAt: meta.data.dispensedAt ? new Date(meta.data.dispensedAt) : undefined,
        ocrExtraction: {
          create: {
            rawText: text,
            fieldsJson: geminiSummary ? { geminiSummary } : undefined,
            overallConfidence: undefined,
          },
        },
        medItems: {
          create: meds.map((nameRaw) => ({
            nameRaw,
            confidence: null,
            needsVerification: false,
          })),
        },
      },
      select: { id: true, createdAt: true },
    });

    return { recordId: record.id, createdAt: record.createdAt };
  }
}


