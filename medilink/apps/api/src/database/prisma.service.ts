import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService
 *
 * Prisma Client를 NestJS DI 컨테이너에서 관리 가능하게 래핑한 서비스
 *
 * 특징:
 * - OnModuleInit: 앱 시작 시 자동으로 DB 연결
 * - OnModuleDestroy: 앱 종료 시 자동으로 DB 연결 해제
 * - @Injectable: DI 컨테이너에 등록되어 다른 서비스에 주입 가능
 *
 * 사용법:
 * ```typescript
 * @Injectable()
 * export class RecordsService {
 *   constructor(private readonly prisma: PrismaService) {}
 *
 *   async getRecords() {
 *     return this.prisma.prescriptionRecord.findMany();
 *   }
 * }
 * ```
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Query 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.$on as any)('query', (e: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.logger.debug(`Query: ${e.query as string}`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.logger.debug(`Duration: ${e.duration as number}ms`);
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('👋 Database disconnected');
  }

  /**
   * 트랜잭션 헬퍼 메서드
   *
   * 사용법:
   * ```typescript
   * await this.prisma.transaction(async (tx) => {
   *   const patient = await tx.patient.create({...});
   *   const record = await tx.prescriptionRecord.create({...});
   *   return record;
   * });
   * ```
   */
  async transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      return fn(tx as PrismaClient);
    });
  }
}
