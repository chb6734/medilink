import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { useInMemoryStore } from '../../lib/config';
import { memGetRecords, memAddRecord } from '../../lib/memory';
import { analyzePatientStatus } from '../../lib/gemini';
import crypto from 'node:crypto';

/**
 * RecordsService
 *
 * 처방전 기록 관련 비즈니스 로직을 처리하는 서비스
 *
 * Phase 2 리팩토링:
 * - RecordsController에서 비즈니스 로직 추출
 * - PrismaService DI로 주입
 * - 트랜잭션 지원
 * - 테스트 가능한 구조
 *
 * TODO:
 * - [ ] getRecords 메서드 이전
 * - [ ] countRecords 메서드 이전
 * - [ ] getCurrentMedications 메서드 이전
 * - [ ] getDoctorSummary 메서드 이전
 * - [ ] createRecord 메서드 이전 (트랜잭션 포함)
 */
@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('RecordsService');
  }

  /**
   * 환자의 처방 기록 개수 조회
   *
   * @param patientId - 환자 ID
   * @param days - 조회 기간 (기본 90일)
   * @returns 기록 개수 및 시작 날짜
   */
  async countRecords(
    patientId: string,
    days: number = 90,
  ): Promise<{ count: number; since: Date; days: number }> {
    this.logger.log(`Counting records for patient ${patientId}, last ${days} days`);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    if (useInMemoryStore) {
      const records = memGetRecords(patientId);
      const count = records.filter((r) => r.createdAt >= since).length;
      return { count, since, days };
    }

    const count = await this.prisma.prescriptionRecord.count({
      where: {
        patientId,
        createdAt: { gte: since },
      },
    });

    return { count, since, days };
  }

  /**
   * 환자의 모든 처방 기록 조회
   *
   * @param patientId - 환자 ID
   * @returns 처방 기록 배열
   */
  async getRecords(patientId: string) {
    this.logger.log(`Getting all records for patient ${patientId}`);

    if (useInMemoryStore) {
      const records = memGetRecords(patientId);
      return records.map((r) => ({
        id: r.id,
        prescriptionDate: r.createdAt.toISOString().slice(0, 10),
        hospitalName: undefined,
        pharmacyName: undefined,
        chiefComplaint: r.chiefComplaint || undefined,
        diagnosis: r.doctorDiagnosis || undefined,
        medications: (r.meds || []).map((m, idx) => ({
          id: `${r.id}-${idx}`,
          name: m.nameRaw,
          dosage: '',
          frequency: '',
          startDate: r.createdAt.toISOString().slice(0, 10),
          prescribedBy: '',
          confidence: undefined,
        })),
        daysSupply: 7,
        ocrConfidence: undefined,
      }));
    }

    const records = await this.prisma.prescriptionRecord.findMany({
      where: { patientId },
      include: {
        medItems: true,
        facility: true,
        ocrExtraction: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      prescriptionDate: (r.prescribedAt || r.dispensedAt || r.createdAt)
        .toISOString()
        .slice(0, 10),
      hospitalName:
        r.facility?.type === 'hospital' || r.facility?.type === 'clinic'
          ? r.facility.name
          : undefined,
      pharmacyName:
        r.facility?.type === 'pharmacy' ? r.facility.name : undefined,
      chiefComplaint: r.chiefComplaint || undefined,
      diagnosis: r.doctorDiagnosis || undefined,
      medications: r.medItems.map((m) => ({
        id: m.id,
        name: m.nameRaw,
        dosage: m.dose || '',
        frequency: m.frequency || '',
        startDate: (r.prescribedAt || r.dispensedAt || r.createdAt)
          .toISOString()
          .slice(0, 10),
        endDate: m.durationDays
          ? new Date(
              new Date(
                r.prescribedAt || r.dispensedAt || r.createdAt,
              ).getTime() +
                m.durationDays * 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .slice(0, 10)
          : undefined,
        prescribedBy: r.facility?.name || '',
        confidence: m.confidence || undefined,
      })),
      daysSupply: r.medItems[0]?.durationDays || 7,
      ocrConfidence: r.ocrExtraction?.overallConfidence || undefined,
    }));
  }

  /**
   * 현재 복용 중인 약물 조회 (완료되지 않은 약)
   *
   * @param patientId - 환자 ID
   * @returns 현재 복용 중인 약물 목록
   */
  async getCurrentMedications(patientId: string) {
    this.logger.log(`Getting current medications for patient ${patientId}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (useInMemoryStore) {
      const allRecords = memGetRecords(patientId);
      const currentMeds: Array<{
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

      for (const record of allRecords) {
        const recordDate = new Date(record.createdAt);
        for (const med of record.meds || []) {
          // Calculate end date: startDate + durationDays (default 7 days)
          const startDate = recordDate;
          const durationDays = 7; // Memory store doesn't have durationDays, default to 7
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + durationDays);

          // Only include medications that have not ended yet (endDate > today)
          if (endDate > today) {
            currentMeds.push({
              id: `${record.id}-${med.nameRaw}`,
              name: med.nameRaw,
              dosage: '', // Memory store doesn't have dose
              frequency: '', // Memory store doesn't have frequency
              startDate: startDate.toISOString().slice(0, 10),
              endDate: endDate.toISOString().slice(0, 10),
              prescribedBy: '', // Memory store doesn't have facilityName
              confidence: undefined, // Memory store doesn't have confidence
              recordId: record.id,
              recordDate: recordDate.toISOString().slice(0, 10),
            });
          }
        }
      }

      return currentMeds;
    }

    const records = await this.prisma.prescriptionRecord.findMany({
      where: { patientId },
      include: {
        medItems: true,
        facility: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentMeds: Array<{
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
      const recordDate =
        record.prescribedAt || record.dispensedAt || record.createdAt;
      for (const med of record.medItems) {
        // Calculate end date: recordDate + durationDays
        const startDate = new Date(recordDate);
        const durationDays = med.durationDays || 7; // default 7 days
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);

        // Only include medications that have not ended yet (endDate > today)
        if (endDate > today) {
          currentMeds.push({
            id: med.id,
            name: med.nameRaw,
            dosage: med.dose || '',
            frequency: med.frequency || '',
            startDate: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10),
            prescribedBy: record.facility?.name || '',
            confidence: med.confidence || undefined,
            recordId: record.id,
            recordDate: recordDate.toISOString().slice(0, 10),
          });
        }
      }
    }

    return currentMeds;
  }

  /**
   * 처방 기록 생성 (트랜잭션 포함)
   *
   * @param data - 처방 기록 생성 데이터
   * @returns 생성된 기록 ID 및 생성 시각
   */
  async createRecord(data: {
    patientId: string;
    recordType: 'dispensing_record' | 'prescription';
    facilityName?: string;
    facilityType?: 'clinic' | 'hospital' | 'pharmacy' | 'unknown';
    chiefComplaint?: string;
    doctorDiagnosis?: string;
    noteDoctorSaid?: string;
    prescribedAt?: string;
    dispensedAt?: string;
    daysSupply?: number;
    medications: Array<{
      nameRaw: string;
      dose?: string;
      frequency?: string;
      confidence?: number | null;
    }>;
    ocrRawText: string;
    geminiSummary?: string;
  }): Promise<{ recordId: string; createdAt: Date }> {
    this.logger.log(`Creating record for patient ${data.patientId}`);

    if (useInMemoryStore) {
      const recordId = crypto.randomUUID();
      memAddRecord({
        id: recordId,
        patientId: data.patientId,
        recordType: data.recordType,
        createdAt: new Date(),
        chiefComplaint: data.chiefComplaint,
        doctorDiagnosis: data.doctorDiagnosis,
        noteDoctorSaid: data.noteDoctorSaid,
        meds: data.medications.map((m) => ({
          nameRaw: m.nameRaw,
          needsVerification: false,
        })),
        rawText: data.ocrRawText,
        geminiSummary: data.geminiSummary,
      });
      return { recordId, createdAt: new Date() };
    }

    // 트랜잭션으로 모든 DB 작업을 원자적으로 처리
    return this.prisma.$transaction(async (tx) => {
      // 1. 환자 Upsert
      const patient = await tx.patient.upsert({
        where: { id: data.patientId },
        update: {},
        create: { id: data.patientId },
      });

      // 2. 병원/약국 정보 생성 (있는 경우)
      let facilityId: string | null = null;
      if (data.facilityName) {
        const facility = await tx.facility.create({
          data: {
            name: data.facilityName,
            type: data.facilityType ?? 'unknown',
          },
        });
        facilityId = facility.id;
      }

      // 3. 처방 기록 생성 (+ OCR 추출 정보 + 약물 목록)
      const record = await tx.prescriptionRecord.create({
        data: {
          patientId: patient.id,
          facilityId,
          recordType: data.recordType,
          chiefComplaint: data.chiefComplaint,
          doctorDiagnosis: data.doctorDiagnosis,
          noteDoctorSaid: data.noteDoctorSaid,
          prescribedAt: data.prescribedAt
            ? new Date(data.prescribedAt)
            : undefined,
          dispensedAt: data.dispensedAt
            ? new Date(data.dispensedAt)
            : undefined,
          daysSupply: data.daysSupply,
          ocrExtraction: {
            create: {
              rawText: data.ocrRawText,
              fieldsJson: data.geminiSummary
                ? { geminiSummary: data.geminiSummary }
                : undefined,
              overallConfidence: undefined,
            },
          },
          medItems: {
            create: data.medications.map((m) => ({
              nameRaw: m.nameRaw,
              dose: m.dose,
              frequency: m.frequency,
              confidence: m.confidence,
              needsVerification: false,
            })),
          },
        },
        select: { id: true, createdAt: true },
      });

      this.logger.log(`Record created successfully: ${record.id}`);

      return {
        recordId: record.id,
        createdAt: record.createdAt,
      };
    });
  }

  /**
   * 의사용 환자 요약 정보 조회
   *
   * @param patientId - 환자 ID
   * @returns 처방 기록, 접수 양식, 현재 복용 약물, 복약 이력, AI 분석 결과
   */
  async getDoctorSummary(patientId: string) {
    this.logger.log(`Getting doctor summary for patient ${patientId}`);

    if (useInMemoryStore) {
      // Return empty data for in-memory store
      return {
        records: [],
        intakeForms: [],
        currentMedications: [],
        medicationHistory: [],
        aiAnalysis: null,
      };
    }

    // First get all prescription records for this patient
    const patientRecords = await this.prisma.prescriptionRecord.findMany({
      where: { patientId },
      select: { id: true },
    });
    const recordIds = patientRecords.map((r) => r.id);

    const [records, intakeForms, medicationChecks, dailyConditions] =
      await Promise.all([
        this.prisma.prescriptionRecord.findMany({
          where: { patientId },
          include: {
            medItems: true,
            facility: true,
            ocrExtraction: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.intakeForm.findMany({
          where: { patientId },
          include: {
            facility: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.medicationCheck.findMany({
          where: {
            prescriptionRecordId: {
              in: recordIds,
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 100,
        }),
        this.prisma.dailyCondition.findMany({
          where: { patientId },
          orderBy: { recordDate: 'desc' },
          take: 30,
        }),
      ]);

    // Get current medications
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMeds: Array<{
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
      const recordDate =
        record.prescribedAt || record.dispensedAt || record.createdAt;
      for (const med of record.medItems) {
        const startDate = new Date(recordDate);
        const durationDays = med.durationDays || 7;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);

        // Only include medications that have not ended yet (endDate > today)
        if (endDate > today) {
          currentMeds.push({
            id: med.id,
            name: med.nameRaw,
            dosage: med.dose || '',
            frequency: med.frequency || '',
            startDate: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10),
            prescribedBy: record.facility?.name || '',
            confidence: med.confidence || undefined,
            recordId: record.id,
            recordDate: recordDate.toISOString().slice(0, 10),
          });
        }
      }
    }

    // Build medication history from MedicationCheck and DailyCondition
    const medicationHistoryMap = new Map<
      string,
      {
        date: Date;
        dateStr: string;
        taken: boolean;
        symptomLevel: number;
        notes: string | null;
      }
    >();

    // Process medication checks (복약 체크 기록)
    for (const check of medicationChecks) {
      const dateStr = check.scheduledAt.toISOString().slice(0, 10);
      if (!medicationHistoryMap.has(dateStr)) {
        medicationHistoryMap.set(dateStr, {
          date: check.scheduledAt,
          dateStr,
          taken: check.isTaken,
          symptomLevel: 3, // default, will be updated by DailyCondition
          notes: null,
        });
      } else {
        // If multiple checks on same day, consider taken if any is taken
        const existing = medicationHistoryMap.get(dateStr)!;
        existing.taken = existing.taken || check.isTaken;
      }
    }

    // Process daily conditions (일별 컨디션 기록)
    for (const condition of dailyConditions) {
      const dateStr = condition.recordDate.toISOString().slice(0, 10);
      const symptomLevel =
        condition.status === 'improving'
          ? 1
          : condition.status === 'same'
            ? 3
            : condition.status === 'worsening'
              ? 5
              : condition.status === 'fluctuating'
                ? 4
                : 3;

      if (medicationHistoryMap.has(dateStr)) {
        const existing = medicationHistoryMap.get(dateStr)!;
        existing.symptomLevel = symptomLevel;
        existing.notes = condition.note || existing.notes;
      } else {
        medicationHistoryMap.set(dateStr, {
          date: condition.recordDate,
          dateStr,
          taken: false, // No medication check data for this day
          symptomLevel,
          notes: condition.note || null,
        });
      }
    }

    // Convert to array and sort by date descending
    const medicationHistory = Array.from(medicationHistoryMap.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 14); // Last 14 days

    // Get AI analysis
    let aiAnalysis: string | null = null;
    try {
      const latestIntake = intakeForms[0];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const analysisResult: string | null = await analyzePatientStatus({
        chiefComplaints: intakeForms.map((f) => ({
          complaint: f.chiefComplaint,
          date: f.createdAt.toISOString().slice(0, 10),
        })),
        currentMedications: currentMeds.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        })),
        medicationHistory: medicationHistory.map((h) => ({
          date: h.dateStr,
          taken: h.taken,
          symptomLevel: h.symptomLevel,
          notes: h.notes || undefined,
        })),
        patientNotes:
          latestIntake?.adherenceReason ||
          latestIntake?.courseNote ||
          undefined,
      });
      aiAnalysis = analysisResult;
    } catch (error) {
      this.logger.error('AI 분석 실패:', error);
      aiAnalysis = null;
    }

    return {
      records: records.map((r) => ({
        id: r.id,
        prescriptionDate: (r.prescribedAt || r.dispensedAt || r.createdAt)
          .toISOString()
          .slice(0, 10),
        hospitalName:
          r.facility?.type === 'hospital' || r.facility?.type === 'clinic'
            ? r.facility.name
            : undefined,
        pharmacyName:
          r.facility?.type === 'pharmacy' ? r.facility.name : undefined,
        chiefComplaint: r.chiefComplaint || undefined,
        diagnosis: r.doctorDiagnosis || undefined,
        medications: r.medItems.map((m) => ({
          id: m.id,
          name: m.nameRaw,
          dosage: m.dose || '',
          frequency: m.frequency || '',
          startDate: (r.prescribedAt || r.dispensedAt || r.createdAt)
            .toISOString()
            .slice(0, 10),
          endDate: m.durationDays
            ? new Date(
                new Date(
                  r.prescribedAt || r.dispensedAt || r.createdAt,
                ).getTime() +
                  m.durationDays * 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .slice(0, 10)
            : undefined,
          prescribedBy: r.facility?.name || '',
          confidence: m.confidence || undefined,
        })),
        ocrConfidence: r.ocrExtraction?.overallConfidence || undefined,
      })),
      intakeForms: intakeForms.map((f) => ({
        id: f.id,
        chiefComplaint: f.chiefComplaint,
        symptomStart:
          f.onsetText || f.onsetAt?.toISOString().slice(0, 10) || '',
        symptomProgress: f.courseNote || f.course,
        sideEffects: f.adverseEvents || '없음',
        allergies: f.allergies || '없음',
        patientNotes: f.adherenceReason || undefined,
        createdAt: f.createdAt.toISOString(),
      })),
      currentMedications: currentMeds,
      medicationHistory: medicationHistory.map((h) => ({
        date: h.dateStr,
        taken: h.taken,
        symptomLevel: h.symptomLevel,
        notes: h.notes,
      })),
      aiAnalysis,
    };
  }

  /**
   * 처방 기록 업데이트 (복약 순응도 추적용)
   *
   * @param recordId - 기록 ID
   * @param data - 업데이트 데이터 (dailyLog, alarmTimes, medications)
   * @returns 업데이트 결과
   */
  async updateRecord(
    recordId: string,
    data: {
      dailyLog?: Record<string, boolean>;
      alarmTimes?: string[];
      medications?: Array<{
        id: string;
        name: string;
        dosage: string;
        frequency: string;
      }>;
    },
  ): Promise<{ id: string; updated: boolean }> {
    this.logger.log(`Updating record ${recordId}`);

    if (useInMemoryStore) {
      // Memory store doesn't support updates for now
      return { id: recordId, updated: true };
    }

    // TODO: Implement actual update logic when we have a dailyLog table
    // For now, just return success as a placeholder
    return { id: recordId, updated: true };
  }

  /**
   * 환경 변수 체크: DATABASE_URL이 설정되어 있는지 확인
   */
  ensureDbConfigured() {
    if (useInMemoryStore) return;
    if (!process.env.DATABASE_URL) {
      throw new BadRequestException({
        error: 'db_not_configured',
        hint: 'Set DATABASE_URL',
      });
    }
  }
}
