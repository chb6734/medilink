import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@medilink/db';
import { useInMemoryStore, visionEnabled } from '../lib/config';
import {
  ocrTextFromImageBytes,
  type TextAnnotation,
  type OcrResult,
} from '../lib/vision';
import { summarizeForClinician, analyzePatientStatus } from '../lib/gemini';
import { parseMedCandidates } from '../lib/meds';
import { isAuthEnabled } from '../lib/auth';
import { memAddRecord, memGetRecords } from '../lib/memory';
import {
  extractMedicationsFromImage,
  isGeminiOcrEnabled,
} from '../lib/genaiOcr';
import { RecordsService } from '../modules/records/records.service';

function requireAuth(req: Request) {
  if (!isAuthEnabled()) {
    console.log('🔓 인증 비활성화됨, requireAuth 통과');
    return;
  }

  console.log('🔍 인증 확인:', {
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    userId: req.session?.user?.id,
    sessionId: req.sessionID,
    cookies: req.headers.cookie,
  });

  if (!req.session?.user) {
    console.error('❌ 인증 실패: 세션에 사용자 정보 없음');
    throw new UnauthorizedException('unauthorized');
  }

  console.log('✅ 인증 성공:', req.session.user.id);
}

function ensureDbConfigured() {
  if (useInMemoryStore) return;
  if (!process.env.DATABASE_URL) {
    throw new ServiceUnavailableException({
      error: 'db_not_configured',
      hint: 'Set DATABASE_URL',
    });
  }
}

@Controller()
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  // Record count for patient (default last 90 days)
  @Get('/api/records/count')
  async count(@Req() req: Request, @Query() query: unknown) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    const parsed = z
      .object({
        patientId: z.string().uuid(),
        days: z.coerce.number().int().positive().max(3650).optional(),
      })
      .safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException({
        error: 'invalid_query',
        details: parsed.error.flatten(),
      });
    }

    return this.recordsService.countRecords(
      parsed.data.patientId,
      parsed.data.days,
    );
  }

  // Get all records for patient
  @Get('/api/records')
  async getRecords(@Req() req: Request, @Query() query: unknown) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    const parsed = z
      .object({
        patientId: z.string().uuid(),
      })
      .safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException({
        error: 'invalid_query',
        details: parsed.error.flatten(),
      });
    }

    const records = await this.recordsService.getRecords(parsed.data.patientId);
    return { records };
  }

  // Update record (for medication compliance tracking)
  @Put('/api/records/:id')
  async updateRecord(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    const parsed = z
      .object({
        dailyLog: z.record(z.string(), z.boolean()).optional(),
        alarmTimes: z.array(z.string()).optional(),
        medications: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              dosage: z.string(),
              frequency: z.string(),
            }),
          )
          .optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    return this.recordsService.updateRecord(id, parsed.data);
  }

  // OCR Preview (no DB write)
  @Post('/api/records/preview-ocr')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async previewOcr(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('file_required');

    const buf = file.buffer;
    let text = '';
    let overallConfidence: number | null = null;
    let hospitalName: string | null = null;
    let patientCondition: string | null = null;
    let medicationsDetailed: Array<{
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
    }> | null = null;

    // Prefer Gemini multimodal extraction if enabled (AS-IS behavior)
    const geminiEnabled = isGeminiOcrEnabled();
    console.log('\n' + '='.repeat(80));
    console.log('📸 OCR 요청 받음');
    console.log('='.repeat(80));
    console.log('파일 크기:', buf.length, 'bytes');
    console.log('MIME 타입:', file.mimetype);
    console.log('Gemini OCR 활성화:', geminiEnabled);
    console.log('='.repeat(80) + '\n');

    // Vision API에서 bounding box 정보 가져오기 (Gemini OCR과 병렬로 실행)
    // Gemini OCR을 사용하더라도 bounding box 정보를 위해 Vision API 호출 시도
    let textAnnotations: TextAnnotation[] | undefined = undefined;
    console.log(`\n🔍 Vision API 설정 확인:`, {
      visionEnabled,
      geminiEnabled,
    });

    // Gemini OCR을 사용할 때도 bounding box를 위해 Vision API 호출 시도
    const shouldCallVision = visionEnabled || geminiEnabled;
    const visionPromise: Promise<TextAnnotation[] | undefined> =
      shouldCallVision
        ? (ocrTextFromImageBytes(buf) as Promise<OcrResult>)
            .then((r): TextAnnotation[] => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              const count = r.textAnnotations.length;
              console.log(`✅ Vision API 성공: ${count}개 텍스트 영역 발견`);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
              return r.textAnnotations;
            })
            .catch((e: unknown): undefined => {
              const errorMessage = e instanceof Error ? e.message : String(e);
              const errorStack = e instanceof Error ? e.stack : undefined;
              console.error('❌ Vision API 호출 실패:', errorMessage);
              if (errorStack) {
                console.error('   스택:', errorStack);
              }
              console.warn('   ⚠️ bounding box 정보 없이 계속 진행합니다.');
              return undefined;
            })
        : Promise.resolve<TextAnnotation[] | undefined>(undefined);

    if (geminiEnabled) {
      console.log('🚀 Gemini OCR 시작...\n');
      const r = await extractMedicationsFromImage(
        buf,
        file.mimetype || 'image/jpeg',
      );
      text = r.rawText ?? '';
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
      console.log('✅ Gemini OCR 완료\n');

      // Vision API 결과도 가져오기 (bounding box용)
      const visionResult = await visionPromise;
      if (visionResult && visionResult.length > 0) {
        textAnnotations = visionResult;
        console.log(
          `📦 Vision API bounding box 정보: ${visionResult.length}개 텍스트 영역`,
        );
        const sampleAnnotations: TextAnnotation[] = Array.isArray(visionResult)
          ? visionResult.slice(0, 5)
          : [];
        console.log(
          `   샘플 (처음 5개):`,
          sampleAnnotations.map((a: TextAnnotation) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const text = a.text.substring(0, 20);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const bbox = a.boundingBox;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { text, bbox };
          }),
        );
      } else {
        textAnnotations = undefined;
        console.warn(
          `⚠️ Vision API bounding box 정보 없음 (textAnnotations: ${visionResult?.length ?? 0}개)`,
        );
      }
    } else if (useInMemoryStore && !visionEnabled) {
      text =
        'OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.';
      overallConfidence = null;
    } else {
      try {
        const r = await ocrTextFromImageBytes(buf);
        text = r.text;
        overallConfidence = r.overallConfidence;
        textAnnotations = r.textAnnotations as TextAnnotation[]; // Vision API에서 bounding box 정보 가져오기
      } catch (e: unknown) {
        if (useInMemoryStore) {
          text =
            'OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.';
          overallConfidence = null;
        } else {
          const errorMessage = e instanceof Error ? e.message : String(e);
          throw new ServiceUnavailableException({
            error: 'ocr_unavailable',
            hint: 'Configure Google Cloud Vision credentials (ADC / GOOGLE_APPLICATION_CREDENTIALS).',
            details: errorMessage,
          });
        }
      }
    }

    const meds = medicationsDetailed
      ? medicationsDetailed.map((m) => m.medicationName).filter(Boolean)
      : parseMedCandidates(text);

    const response = {
      rawText: text,
      overallConfidence,
      meds: meds.map((nameRaw) => ({ nameRaw, confidence: null })),
      hospitalName,
      patientCondition,
      medications: medicationsDetailed,
      textAnnotations, // bounding box 정보 포함
    };

    console.log(`\n📤 응답 데이터:`, {
      rawTextLength: response.rawText?.length || 0,
      textAnnotationsCount: response.textAnnotations?.length || 0,
      medicationsCount: response.medications?.length || 0,
      hospitalName: response.hospitalName || '없음',
    });

    return response;
  }

  // Create record with OCR + DB write (no image storage)
  // Get current medications (not completed yet)
  @Get('/api/records/current-medications')
  async getCurrentMedications(@Req() req: Request, @Query() query: unknown) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    const parsed = z
      .object({
        patientId: z.string().uuid(),
      })
      .safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException({
        error: 'invalid_query',
        details: parsed.error.flatten(),
      });
    }

    const medications = await this.recordsService.getCurrentMedications(
      parsed.data.patientId,
    );

    return { medications };
  }

  // Get patient summary data for doctor view
  @Get('/api/records/doctor-summary')
  async getDoctorSummary(@Req() req: Request, @Query() query: unknown) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    const parsed = z
      .object({
        patientId: z.string().uuid(),
      })
      .safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException({
        error: 'invalid_query',
        details: parsed.error.flatten(),
      });
    }

    return this.recordsService.getDoctorSummary(parsed.data.patientId);
  }

  @Post('/api/records')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async createRecord(
    @Req() req: Request,
    @Query() query: unknown,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);
    if (!file?.buffer) throw new BadRequestException('file_required');

    const meta = z
      .object({
        patientId: z.string().uuid(),
        recordType: z.enum(['dispensing_record', 'prescription']),
        facilityName: z.string().min(1).max(200).optional(),
        facilityType: z
          .enum(['clinic', 'hospital', 'pharmacy', 'unknown'])
          .optional(),
        chiefComplaint: z.string().max(200).optional(),
        doctorDiagnosis: z.string().max(200).optional(),
        noteDoctorSaid: z.string().max(500).optional(),
        prescribedAt: z.string().datetime().optional(),
        dispensedAt: z.string().datetime().optional(),
        // 클라이언트에서 분석된 데이터 추가 수용
        medications: z
          .array(
            z.object({
              name: z.string(),
              dosage: z.string().optional(),
              frequency: z.string().optional(),
              confidence: z.number().optional(),
            }),
          )
          .optional(),
        daysSupply: z.coerce.number().optional(),
      })
      .safeParse(query);

    if (!meta.success) {
      throw new BadRequestException({
        error: 'invalid_meta',
        details: meta.error.flatten(),
      });
    }

    const buf = file.buffer;
    let text = '';

    // 클라이언트가 약물 정보를 보냈다면 OCR을 다시 하지 않음 (성능 및 정확도 향상)
    if (meta.data.medications && meta.data.medications.length > 0) {
      console.log(
        '✅ 클라이언트에서 분석된 데이터를 받았습니다. 중복 OCR을 건너뜁니다.',
      );
      text = `Client-side analyzed record with ${meta.data.medications.length} meds`;
    } else if (useInMemoryStore && !visionEnabled) {
      text =
        'OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.';
    } else {
      try {
        const r = await ocrTextFromImageBytes(buf);
        text = r.text;
      } catch (e: unknown) {
        if (useInMemoryStore) {
          text =
            'OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.';
        } else {
          const errorMessage = e instanceof Error ? e.message : String(e);
          throw new ServiceUnavailableException({
            error: 'ocr_unavailable',
            hint: 'Configure Google Cloud Vision credentials (ADC / GOOGLE_APPLICATION_CREDENTIALS).',
            details: errorMessage,
          });
        }
      }
    }

    // 클라이언트 데이터가 있으면 그것을 우선 사용, 없으면 서버에서 파싱 시도
    const finalMeds =
      meta.data.medications && meta.data.medications.length > 0
        ? meta.data.medications.map((m) => ({
            nameRaw: m.name,
            dose: m.dosage,
            frequency: m.frequency,
            confidence: m.confidence ?? null,
          }))
        : parseMedCandidates(text).map((nameRaw) => ({
            nameRaw,
            dose: '',
            frequency: '',
            confidence: null as number | null,
          }));

    const geminiSummary =
      meta.data.medications && meta.data.medications.length > 0
        ? `Analzed ${meta.data.medications.length} meds: ${meta.data.medications.map((m) => m.name).join(', ')}`
        : await summarizeForClinician(text);

    // Service로 위임 (트랜잭션 포함)
    return this.recordsService.createRecord({
      patientId: meta.data.patientId,
      recordType: meta.data.recordType,
      facilityName: meta.data.facilityName,
      facilityType: meta.data.facilityType,
      chiefComplaint: meta.data.chiefComplaint,
      doctorDiagnosis: meta.data.doctorDiagnosis,
      noteDoctorSaid: meta.data.noteDoctorSaid,
      prescribedAt: meta.data.prescribedAt,
      dispensedAt: meta.data.dispensedAt,
      daysSupply: meta.data.daysSupply,
      medications: finalMeds,
      ocrRawText: text,
      geminiSummary,
    });
  }
}
