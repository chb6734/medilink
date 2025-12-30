import "./lib/loadEnv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { prisma } from "@medilink/db";
import { ocrTextFromImageBytes } from "./lib/vision";
import { randomToken, sha256Base64Url } from "./lib/crypto";
import { summarizeForClinician } from "./lib/gemini";
import crypto from "node:crypto";
import {
  getGoogleClient,
  isAuthEnabled,
  randomOtpCode,
  registerAuth,
  requireAuth,
  sha256,
} from "./lib/auth";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({
  logger: true,
});

await registerAuth(app);

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

app.get("/health", async () => ({ ok: true }));

app.get("/api/auth/me", async (req: any) => {
  return {
    authEnabled: isAuthEnabled(),
    user: req.session?.user ?? null,
  };
});

// Google login (ID token from client)
app.post("/api/auth/google", async (req: any, reply) => {
  if (!isAuthEnabled()) return reply.code(404).send({ error: "auth_disabled" });

  const body = z.object({ idToken: z.string().min(10) }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: "invalid_body" });

  try {
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: body.data.idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) return reply.code(401).send({ error: "invalid_token" });

    req.session.user = {
      id: crypto.randomUUID(),
      provider: "google",
      subject: payload.sub,
      displayName: payload.name ?? payload.email ?? undefined,
    };
    return { ok: true };
  } catch (e) {
    return reply.code(401).send({
      error: "google_verify_failed",
      details: String((e as any)?.message ?? e),
    });
  }
});

// Phone OTP (DEV skeleton)
const otpStore = new Map<
  string,
  { phoneE164: string; codeHash: string; expiresAt: number; tries: number }
>();

app.post("/api/auth/phone/start", async (req: any, reply) => {
  if (!isAuthEnabled()) return reply.code(404).send({ error: "auth_disabled" });

  const body = z
    .object({ phoneE164: z.string().min(8).max(20) })
    .safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: "invalid_body" });

  const challengeId = crypto.randomUUID();
  const code = randomOtpCode();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(challengeId, {
    phoneE164: body.data.phoneE164,
    codeHash: sha256(code),
    expiresAt,
    tries: 0,
  });

  // DEV: print OTP to server log. Replace with SMS vendor in production.
  app.log.warn({ phone: body.data.phoneE164, code }, "DEV_OTP_CODE");

  return { challengeId, expiresAt };
});

app.post("/api/auth/phone/verify", async (req: any, reply) => {
  if (!isAuthEnabled()) return reply.code(404).send({ error: "auth_disabled" });

  const body = z
    .object({ challengeId: z.string().uuid(), code: z.string().min(4).max(10) })
    .safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: "invalid_body" });

  const entry = otpStore.get(body.data.challengeId);
  if (!entry) return reply.code(404).send({ error: "challenge_not_found" });
  if (Date.now() > entry.expiresAt)
    return reply.code(410).send({ error: "challenge_expired" });

  entry.tries += 1;
  if (entry.tries > 5) return reply.code(429).send({ error: "too_many_tries" });

  if (sha256(body.data.code) !== entry.codeHash)
    return reply.code(401).send({ error: "invalid_code" });

  req.session.user = {
    id: crypto.randomUUID(),
    provider: "phone",
    subject: entry.phoneE164,
    phoneE164: entry.phoneE164,
  };
  otpStore.delete(body.data.challengeId);
  return { ok: true };
});

app.post("/api/auth/logout", async (req: any) => {
  req.session.user = undefined;
  return { ok: true };
});

/**
 * Dev convenience: if DATABASE_URL is not set, fall back to an in-memory store
 * so the demo flow works without local DB setup.
 *
 * In production (NODE_ENV=production), we keep the strict requirement for DB.
 */
const useInMemoryStore =
  !process.env.DATABASE_URL && process.env.NODE_ENV !== "production";

// Dev-safe guard: avoid constructing Vision client unless explicitly configured.
// This prevents google-auth ADC lookup from crashing the dev server when creds are missing.
const visionEnabled =
  process.env.VISION_ENABLED === "true" ||
  !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

type MemoryRecord = {
  id: string;
  patientId: string;
  recordType: "dispensing_record" | "prescription";
  createdAt: Date;
  chiefComplaint?: string;
  doctorDiagnosis?: string;
  noteDoctorSaid?: string;
  meds: Array<{ nameRaw: string; needsVerification: boolean }>;
  rawText: string | null;
  geminiSummary: string | null;
};

type MemoryShare = {
  id: string;
  patientId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

const memory = {
  recordsByPatient: new Map<string, MemoryRecord[]>(),
  sharesByTokenHash: new Map<string, MemoryShare>(),
  sharesByPatient: new Map<string, MemoryShare[]>(),
};

function ensureDbConfigured(reply: any) {
  if (useInMemoryStore) return true;
  if (!process.env.DATABASE_URL) {
    reply
      .code(503)
      .send({ error: "db_not_configured", hint: "Set DATABASE_URL" });
    return false;
  }
  return true;
}

function memAddRecord(r: MemoryRecord) {
  const arr = memory.recordsByPatient.get(r.patientId) ?? [];
  arr.unshift(r);
  memory.recordsByPatient.set(r.patientId, arr.slice(0, 50));
}

function memRevokeShares(patientId: string) {
  const arr = memory.sharesByPatient.get(patientId) ?? [];
  const now = new Date();
  for (const s of arr) {
    if (!s.revokedAt && s.expiresAt > now) s.revokedAt = now;
  }
  memory.sharesByPatient.set(patientId, arr);
}

function memCreateShare(patientId: string, tokenHash: string, expiresAt: Date) {
  const s: MemoryShare = {
    id: crypto.randomUUID(),
    patientId,
    tokenHash,
    expiresAt,
    revokedAt: null,
    createdAt: new Date(),
  };
  memory.sharesByTokenHash.set(tokenHash, s);
  const arr = memory.sharesByPatient.get(patientId) ?? [];
  arr.unshift(s);
  memory.sharesByPatient.set(patientId, arr.slice(0, 20));
  return s;
}

function parseMedCandidates(text: string) {
  // MVP heuristic: extract non-empty lines, de-dup, cap to 30.
  // We keep OCR raw; proper normalization comes later.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2)
    .slice(0, 200);

  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const key = l.replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(key);
    if (uniq.length >= 30) break;
  }
  return uniq;
}

// OCR Preview (no DB write)
app.post("/api/records/preview-ocr", async (req, reply) => {
  const file = await req.file();
  if (!file) return reply.code(400).send({ error: "file_required" });

  const buf = await file.toBuffer();
  let text = "";
  let overallConfidence: number | null = null;
  if (useInMemoryStore && !visionEnabled) {
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
        // Dev fallback: allow UI to proceed without GCP creds.
        text =
          "OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.";
        overallConfidence = null;
      } else {
        return reply.code(503).send({
          error: "ocr_unavailable",
          hint: "Configure Google Cloud Vision credentials (ADC / GOOGLE_APPLICATION_CREDENTIALS).",
          details: String((e as any)?.message ?? e),
        });
      }
    }
  }
  const meds = parseMedCandidates(text);

  return {
    rawText: text,
    overallConfidence,
    meds: meds.map((nameRaw) => ({ nameRaw, confidence: null })),
  };
});

// Create record with OCR + DB write (no image storage)
app.post("/api/records", async (req, reply) => {
  if (!ensureDbConfigured(reply)) return;
  if (!requireAuth(req, reply)) return;
  const file = await req.file();
  if (!file) return reply.code(400).send({ error: "file_required" });

  // meta can be passed via querystring on multipart request
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
    .safeParse(req.query);

  if (!meta.success) {
    return reply
      .code(400)
      .send({ error: "invalid_meta", details: meta.error.flatten() });
  }

  const buf = await file.toBuffer();
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
        return reply.code(503).send({
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
      dispensedAt: meta.data.dispensedAt
        ? new Date(meta.data.dispensedAt)
        : undefined,
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
});

// Create share token (TTL 10min) - patient-only re-issue should revoke prior tokens
app.post("/api/share-tokens", async (req, reply) => {
  if (!ensureDbConfigured(reply)) return;
  if (!requireAuth(req, reply)) return;
  const body = z
    .object({
      patientId: z.string().uuid(),
      facilityId: z.string().uuid().optional(),
    })
    .safeParse(req.body);

  if (!body.success) {
    return reply
      .code(400)
      .send({ error: "invalid_body", details: body.error.flatten() });
  }

  const token = randomToken(32);
  const tokenHash = sha256Base64Url(token);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  if (useInMemoryStore) {
    memRevokeShares(body.data.patientId);
    memCreateShare(body.data.patientId, tokenHash, expiresAt);
    return { token, expiresAt };
  }

  // revoke previous active tokens for this patient
  await prisma.shareToken.updateMany({
    where: {
      patientId: body.data.patientId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  });

  await prisma.shareToken.create({
    data: {
      patientId: body.data.patientId,
      facilityId: body.data.facilityId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
});

// Clinician viewer (no login) - TTL within re-open allowed
app.get("/share/:token", async (req, reply) => {
  if (!ensureDbConfigured(reply)) return;
  const params = z.object({ token: z.string().min(10) }).safeParse(req.params);
  if (!params.success) return reply.code(400).send({ error: "invalid_token" });

  const tokenHash = sha256Base64Url(params.data.token);

  if (useInMemoryStore) {
    const share = memory.sharesByTokenHash.get(tokenHash);
    if (!share || share.revokedAt)
      return reply.code(404).send({ error: "not_found" });
    if (share.expiresAt.getTime() <= Date.now())
      return reply.code(410).send({ error: "expired" });

    const records = memory.recordsByPatient.get(share.patientId) ?? [];
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

  if (!share || share.revokedAt)
    return reply.code(404).send({ error: "not_found" });
  if (share.expiresAt.getTime() <= Date.now())
    return reply.code(410).send({ error: "expired" });

  // Minimal access log (PII-minimized)
  await prisma.accessLog.create({
    data: {
      shareTokenId: share.id,
      ipHash: req.ip ? sha256Base64Url(req.ip) : undefined,
      userAgentHash: req.headers["user-agent"]
        ? sha256Base64Url(String(req.headers["user-agent"]))
        : undefined,
    },
  });

  // Build a minimal clinician summary for MVP
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
      geminiSummary:
        (r.ocrExtraction?.fieldsJson as any)?.geminiSummary ?? null,
      rawText: r.ocrExtraction?.rawText ?? null,
    })),
  };
});

await app.listen({ port: PORT, host: HOST });
