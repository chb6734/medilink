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
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '@medilink/db';
import { useInMemoryStore } from '../lib/config';
import { isAuthEnabled } from '../lib/auth';
import { randomToken, sha256Base64Url } from '../lib/crypto';
import { verifyToken } from '../lib/jwt';
import {
  memCreateShare,
  memGetRecords,
  memGetShareByHash,
  memRevokeShares,
} from '../lib/memory';
import { analyzePatientStatus } from '../lib/gemini';

function requireAuth(req: Request) {
  if (!isAuthEnabled()) return;

  const token = req.cookies?.['auth_token'];
  if (!token) {
    throw new UnauthorizedException('unauthorized');
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new UnauthorizedException('unauthorized');
  }
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
export class ShareController {
  // Create share token (TTL 10min) - patient-only re-issue should revoke prior tokens
  @Post('/api/share-tokens')
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
        error: 'invalid_body',
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
  @Get('/share/:token')
  async getShare(@Req() req: Request, @Param('token') tokenParam: string) {
    ensureDbConfigured();
    const params = z
      .object({ token: z.string().min(10) })
      .safeParse({ token: tokenParam });
    if (!params.success)
      throw new BadRequestException({ error: 'invalid_token' });

    const tokenHash = sha256Base64Url(params.data.token);

    if (useInMemoryStore) {
      const share = memGetShareByHash(tokenHash);
      if (!share || share.revokedAt)
        throw new NotFoundException({ error: 'not_found' });
      if (share.expiresAt.getTime() <= Date.now())
        throw new GoneException({ error: 'expired' });

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
        questionnaire: null, // 인메모리 모드에서는 문진표 미지원
        patient: null, // 인메모리 모드에서는 환자정보 미지원
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
      throw new NotFoundException({ error: 'not_found' });
    if (share.expiresAt.getTime() <= Date.now())
      throw new GoneException({ error: 'expired' });

    await prisma.accessLog.create({
      data: {
        shareTokenId: share.id,
        ipHash: req.ip ? sha256Base64Url(req.ip) : undefined,
        userAgentHash: req.headers['user-agent']
          ? sha256Base64Url(String(req.headers['user-agent']))
          : undefined,
      },
    });

    const [records, latestIntakeForm, patient, intakeForms, dailyConditions] =
      await Promise.all([
        prisma.prescriptionRecord.findMany({
          where: { patientId: share.patientId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            medItems: true,
            ocrExtraction: true,
            medicationChecks: {
              orderBy: { scheduledAt: 'desc' },
              take: 100,
            },
            facility: true,
          },
        }),
        prisma.intakeForm.findFirst({
          where: { patientId: share.patientId },
          orderBy: { createdAt: 'desc' },
          include: { facility: true },
        }),
        prisma.patient.findUnique({
          where: { id: share.patientId },
          select: {
            id: true,
            name: true,
            birthDate: true,
            bloodType: true,
            heightCm: true,
            weightKg: true,
            allergies: true,
            emergencyContact: true,
          },
        }),
        // 모든 문진 기록 (AI 분석용)
        prisma.intakeForm.findMany({
          where: { patientId: share.patientId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { facility: true },
        }),
        // 일일 상태 기록
        prisma.dailyCondition.findMany({
          where: { patientId: share.patientId },
          orderBy: { recordDate: 'desc' },
          take: 30,
        }),
      ]);

    // course enum을 한글 문자열로 변환
    const courseToKorean = (course: string) => {
      switch (course) {
        case 'improving':
          return '점점 호전';
        case 'worsening':
          return '점점 악화';
        case 'no_change':
          return '변화 없음';
        default:
          return '알 수 없음';
      }
    };

    // adherence enum을 한글 문자열로 변환
    const adherenceToKorean = (adherence: string) => {
      switch (adherence) {
        case 'yes':
          return '잘 복용했어요';
        case 'partial':
          return '대부분 잘 복용했어요';
        case 'no':
          return '잘 복용하지 못했어요';
        default:
          return '해당 없음';
      }
    };

    // 나이 계산
    const calculateAge = (birthDate: Date | null): number | null => {
      if (!birthDate) return null;
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        return age - 1;
      }
      return age;
    };

    // 복약 기록 생성 (MedicationCheck + DailyCondition 결합)
    const medicationHistoryMap = new Map<
      string,
      {
        date: string;
        taken: boolean;
        takenCount: number;
        totalCount: number;
        symptomLevel: number;
        notes: string | null;
      }
    >();

    // MedicationCheck에서 복약 데이터 집계
    for (const record of records) {
      for (const check of record.medicationChecks) {
        const dateStr = check.scheduledAt.toISOString().slice(0, 10);
        const existing = medicationHistoryMap.get(dateStr);
        if (existing) {
          existing.totalCount++;
          if (check.isTaken) existing.takenCount++;
          existing.taken = existing.takenCount > 0;
        } else {
          medicationHistoryMap.set(dateStr, {
            date: dateStr,
            taken: check.isTaken,
            takenCount: check.isTaken ? 1 : 0,
            totalCount: 1,
            symptomLevel: 3, // 기본값
            notes: null,
          });
        }
      }
    }

    // DailyCondition에서 증상 수준 추가
    const statusToLevel = (status: string): number => {
      switch (status) {
        case 'improving':
          return 2;
        case 'same':
          return 3;
        case 'worsening':
          return 4;
        case 'fluctuating':
          return 3;
        default:
          return 3;
      }
    };

    for (const condition of dailyConditions) {
      const dateStr = condition.recordDate.toISOString().slice(0, 10);
      const existing = medicationHistoryMap.get(dateStr);
      if (existing) {
        existing.symptomLevel = statusToLevel(condition.status);
        existing.notes = condition.note;
      } else {
        medicationHistoryMap.set(dateStr, {
          date: dateStr,
          taken: false,
          takenCount: 0,
          totalCount: 0,
          symptomLevel: statusToLevel(condition.status),
          notes: condition.note,
        });
      }
    }

    const medicationHistory = Array.from(medicationHistoryMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    // 현재 복용중인 약 목록 생성 (최근 처방에서)
    const now = new Date();
    const currentMedications: Array<{
      id: string;
      name: string;
      dosage: string;
      frequency: string;
      startDate: string;
      endDate: string | null;
      prescribedBy: string;
      confidence?: number;
      recordId: string;
      recordDate: string;
    }> = [];

    for (const record of records) {
      const startDate = record.prescribedAt ?? record.createdAt;
      const daysSupply = record.daysSupply ?? 7;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysSupply);

      // 아직 복용 기간이 남은 약만 포함
      if (endDate >= now) {
        for (const med of record.medItems) {
          currentMedications.push({
            id: med.id,
            name: med.nameRaw,
            dosage: med.dose ?? '',
            frequency: med.frequency ?? '',
            startDate: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10),
            prescribedBy: record.facility?.name ?? '미지정',
            confidence: med.confidence ?? undefined,
            recordId: record.id,
            recordDate: record.createdAt.toISOString().slice(0, 10),
          });
        }
      }
    }

    // AI 분석 생성
    const chiefComplaints = intakeForms.map((f) => ({
      complaint: f.chiefComplaint,
      date: f.createdAt.toISOString().slice(0, 10),
    }));

    const currentMedsForAI = currentMedications.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
    }));

    const historyForAI = medicationHistory.map((h) => ({
      date: h.date,
      taken: h.taken,
      symptomLevel: h.symptomLevel,
      notes: h.notes ?? undefined,
    }));

    // 모든 문진 기록의 부작용, 알러지 정보 수집
    const allSideEffects = intakeForms
      .map((f) => f.adverseEvents)
      .filter(Boolean)
      .join(', ');
    const allAllergies = [
      patient?.allergies,
      ...intakeForms.map((f) => f.allergies),
    ]
      .filter(Boolean)
      .join(', ');

    // 이전 처방 정보 수집
    const previousPrescriptions = records.slice(0, 10).map((r) => ({
      date: r.createdAt.toISOString().slice(0, 10),
      facility: r.facility?.name ?? '미지정',
      diagnosis: r.doctorDiagnosis ?? '진단 없음',
      chiefComplaint: r.chiefComplaint ?? '',
      medications: r.medItems.map((m) => m.nameRaw).join(', '),
    }));

    const patientNotes = [
      allSideEffects ? `부작용: ${allSideEffects}` : '',
      allAllergies ? `알러지: ${allAllergies}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    let aiAnalysis: string | null = null;
    try {
      aiAnalysis = await analyzePatientStatus({
        chiefComplaints,
        currentMedications: currentMedsForAI,
        medicationHistory: historyForAI,
        patientNotes,
        intakeForms: intakeForms.map((f) => ({
          date: f.createdAt.toISOString().slice(0, 10),
          chiefComplaint: f.chiefComplaint,
          symptomStart: f.onsetText ?? '',
          symptomProgress: courseToKorean(f.course),
          sideEffects: f.adverseEvents ?? '',
          allergies: f.allergies ?? '',
          medicationCompliance: adherenceToKorean(f.adherence),
        })),
        previousPrescriptions,
        patientInfo: patient
          ? {
              age: calculateAge(patient.birthDate),
              bloodType: patient.bloodType,
              allergies: patient.allergies,
            }
          : undefined,
      });
    } catch (e) {
      console.error('AI 분석 오류:', e);
    }

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
          dose: m.dose,
          frequency: m.frequency,
        })),
        geminiSummary:
          (r.ocrExtraction?.fieldsJson as any)?.geminiSummary ?? null,
        rawText: r.ocrExtraction?.rawText ?? null,
        facilityName: r.facility?.name ?? null,
      })),
      questionnaire: latestIntakeForm
        ? {
            hospitalName: latestIntakeForm.facility?.name ?? '미지정',
            chiefComplaint: latestIntakeForm.chiefComplaint,
            symptomStart: latestIntakeForm.onsetText ?? '미입력',
            symptomProgress: latestIntakeForm.courseNote
              ? `${courseToKorean(latestIntakeForm.course)} - ${latestIntakeForm.courseNote}`
              : courseToKorean(latestIntakeForm.course),
            symptomDetail: latestIntakeForm.courseNote ?? undefined,
            medicationCompliance: latestIntakeForm.adherenceReason
              ? `${adherenceToKorean(latestIntakeForm.adherence)} - ${latestIntakeForm.adherenceReason}`
              : adherenceToKorean(latestIntakeForm.adherence),
            sideEffects: latestIntakeForm.adverseEvents ?? '없음',
            allergies: latestIntakeForm.allergies ?? '없음',
            patientNotes: patientNotes,
          }
        : null,
      patient: patient
        ? {
            name: patient.name ?? '환자',
            age: calculateAge(patient.birthDate),
            bloodType: patient.bloodType,
            height: patient.heightCm,
            weight: patient.weightKg,
            allergies: patient.allergies,
            emergencyContact: patient.emergencyContact,
          }
        : null,
      medicationHistory,
      currentMedications,
      aiAnalysis,
    };
  }
}
