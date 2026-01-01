import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

/**
 * 매일 9시 자동 상태 체크 스케줄러
 *
 * @description
 * 매일 오전 9시에 실행되어 활성화된 처방전에 대해 복약 체크 상태를 확인합니다.
 * 실제 운영 환경에서는 푸시 알림, SMS, 이메일 등을 발송할 수 있습니다.
 *
 * @example
 * 스케줄 실행 시:
 * 1. 현재 진행 중인 처방전 조회 (dispensedAt + daysSupply >= 오늘)
 * 2. 각 처방전의 오늘 복약 체크 기록 조회
 * 3. 복약하지 않은 약이 있으면 알림 발송 (TODO)
 * 4. 처방 기간이 끝난 처방전은 completed로 마킹
 */
@Injectable()
export class DailyCheckScheduler {
  private readonly logger = new Logger(DailyCheckScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매일 오전 9시에 실행되는 스케줄러
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'daily-medication-check',
    timeZone: 'Asia/Seoul',
  })
  async handleDailyCheck() {
    this.logger.log('🕘 [9시 자동 체크] 매일 복약 상태 체크 시작');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. 현재 진행 중인 처방전 조회
      const activeRecords = await this.prisma.prescriptionRecord.findMany({
        where: {
          dispensedAt: { not: null },
          daysSupply: { not: null },
          completionDate: null, // 아직 완료되지 않은 처방전만
        },
        include: {
          patient: {
            select: {
              id: true,
            },
          },
          facility: {
            select: {
              name: true,
            },
          },
          medItems: {
            select: {
              id: true,
              nameRaw: true,
              frequency: true,
            },
          },
        },
      });

      this.logger.log(`📋 조회된 처방전: ${activeRecords.length}개`);

      let activeCount = 0;
      let completedCount = 0;
      let missedCheckCount = 0;

      for (const record of activeRecords) {
        if (!record.dispensedAt || !record.daysSupply) continue;

        // 처방 종료일 계산
        const endDate = new Date(record.dispensedAt);
        endDate.setDate(endDate.getDate() + record.daysSupply);
        endDate.setHours(23, 59, 59, 999);

        // 처방 기간 종료 여부 확인
        if (today > endDate) {
          // 처방 기간 종료 → completionDate 설정
          await this.prisma.prescriptionRecord.update({
            where: { id: record.id },
            data: { completionDate: today },
          });
          completedCount++;
          this.logger.log(
            `✅ 처방 완료 처리: 환자 ID ${record.patient?.id || 'Unknown'} - ${record.facility?.name || 'N/A'}`,
          );
          continue;
        }

        // 활성화된 처방전
        activeCount++;

        // 2. 오늘 복약 체크 기록 조회
        const startOfDay = new Date(today);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const todayChecks = await this.prisma.medicationCheck.findMany({
          where: {
            prescriptionRecordId: record.id,
            scheduledAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          select: {
            id: true,
            scheduledAt: true,
            isTaken: true,
            takenAt: true,
          },
        });

        // 3. 복약하지 않은 약 확인
        const missedChecks = todayChecks.filter((check) => !check.isTaken);

        if (missedChecks.length > 0) {
          missedCheckCount += missedChecks.length;
          this.logger.warn(
            `⚠️  복약 누락: 환자 ID ${record.patient?.id || 'Unknown'} - ${missedChecks.length}개 약물`,
          );

          // TODO: 실제 운영 환경에서는 여기서 푸시 알림, SMS 발송
          // 예시:
          // await this.sendPushNotification(record.patient.id, {
          //   title: '복약 알림',
          //   body: `오늘 복약하지 않은 약이 ${missedChecks.length}개 있습니다.`,
          // });
          //
          // await this.sendSMS(record.patient.phone, {
          //   message: `[메디링크] 오늘 복약하지 않은 약이 ${missedChecks.length}개 있습니다. 앱에서 확인해주세요.`,
          // });
        } else if (todayChecks.length > 0) {
          this.logger.log(
            `✅ 복약 완료: 환자 ID ${record.patient?.id || 'Unknown'} - ${todayChecks.length}개 약물`,
          );
        }
      }

      this.logger.log('🏁 [9시 자동 체크] 완료');
      this.logger.log(`📊 통계: 활성 처방 ${activeCount}개 | 완료 처리 ${completedCount}개 | 누락 복약 ${missedCheckCount}개`);
    } catch (error) {
      this.logger.error('❌ [9시 자동 체크] 오류 발생:', error);
    }
  }

  /**
   * 테스트용 즉시 실행 메서드
   * (실제 운영에서는 제거하거나 별도 엔드포인트로 분리)
   */
  async runManualCheck() {
    this.logger.log('🔧 [수동 실행] 상태 체크 시작');
    await this.handleDailyCheck();
  }
}
