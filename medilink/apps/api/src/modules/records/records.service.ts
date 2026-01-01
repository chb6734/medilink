import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { useInMemoryStore } from '../../lib/config';
import { memGetRecords, memAddRecord } from '../../lib/memory';

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
