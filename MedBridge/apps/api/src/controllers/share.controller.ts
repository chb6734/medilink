import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  Param,
  Body,
  NotFoundException,
  GoneException,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@medbridge/db";
import { useInMemoryStore } from "../lib/config";
import { isAuthEnabled } from "../lib/auth";
import { randomToken, sha256Base64Url } from "../lib/crypto";
import {
  memCreateShare,
  memGetRecords,
  memGetShareByHash,
  memRevokeShares,
} from "../lib/memory";

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
export class ShareController {
  // Create share token (TTL 10min) - patient-only re-issue should revoke prior tokens
  @Post("/api/share-tokens")
  async createShareToken(@Req() req: Request, @Body() body: unknown) {
    ensureDbConfigured();
    requireAuth(req);

    const parsed = z
      .object({
        patientId: z.string().uuid(),
        facilityId: z.string().uuid().optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        error: "invalid_body",
        details: parsed.error.flatten(),
      });
    }

    const token = randomToken(32);
    const tokenHash = sha256Base64Url(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (useInMemoryStore) {
      memRevokeShares(parsed.data.patientId);
      memCreateShare(parsed.data.patientId, tokenHash, expiresAt);
      return { token, expiresAt };
    }

    await prisma.shareToken.updateMany({
      where: {
        patientId: parsed.data.patientId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });

    await prisma.shareToken.create({
      data: {
        patientId: parsed.data.patientId,
        facilityId: parsed.data.facilityId,
        tokenHash,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  // Clinician viewer (no login) - TTL within re-open allowed
  @Get("/share/:token")
  async getShare(@Req() req: Request, @Param("token") tokenParam: string) {
    ensureDbConfigured();
    const params = z.object({ token: z.string().min(10) }).safeParse({ token: tokenParam });
    if (!params.success) throw new BadRequestException({ error: "invalid_token" });

    const tokenHash = sha256Base64Url(params.data.token);

    if (useInMemoryStore) {
      const share = memGetShareByHash(tokenHash);
      if (!share || share.revokedAt) throw new NotFoundException({ error: "not_found" });
      if (share.expiresAt.getTime() <= Date.now()) throw new GoneException({ error: "expired" });

      const records = memGetRecords(share.patientId);
      return {
        patientId: share.patientId,
        records: records.slice(0, 20).map((r) => ({
          id: r.id,
          recordType: r.recordType,
          createdAt: r.createdAt,
          chiefComplaint: r.chiefComplaint ?? null,
          doctorDiagnosis: r.doctorDiagnosis ?? null,
          noteDoctorSaid: r.noteDoctorSaid ?? null,
          meds: r.meds,
          geminiSummary: r.geminiSummary ?? null,
          rawText: r.rawText ?? null,
        })),
      };
    }

    const share = await prisma.shareToken.findUnique({
      where: { tokenHash },
      include: {
        patient: true,
        accessLogs: false,
      },
    });

    if (!share || share.revokedAt) throw new NotFoundException({ error: "not_found" });
    if (share.expiresAt.getTime() <= Date.now()) throw new GoneException({ error: "expired" });

    await prisma.accessLog.create({
      data: {
        shareTokenId: share.id,
        ipHash: req.ip ? sha256Base64Url(req.ip) : undefined,
        userAgentHash: req.headers["user-agent"]
          ? sha256Base64Url(String(req.headers["user-agent"]))
          : undefined,
      },
    });

    const records = await prisma.prescriptionRecord.findMany({
      where: { patientId: share.patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { medItems: true, ocrExtraction: true },
    });

    return {
      patientId: share.patientId,
      records: records.map((r) => ({
        id: r.id,
        recordType: r.recordType,
        createdAt: r.createdAt,
        chiefComplaint: r.chiefComplaint,
        doctorDiagnosis: r.doctorDiagnosis,
        noteDoctorSaid: r.noteDoctorSaid,
        meds: r.medItems.map((m) => ({
          nameRaw: m.nameRaw,
          needsVerification: m.needsVerification,
        })),
        geminiSummary: (r.ocrExtraction?.fieldsJson as any)?.geminiSummary ?? null,
        rawText: r.ocrExtraction?.rawText ?? null,
      })),
    };
  }
}


