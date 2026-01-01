import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseModule
 *
 * PrismaService를 전역으로 제공하는 모듈
 *
 * @Global 데코레이터:
 * - 모든 모듈에서 PrismaService를 자동으로 사용 가능
 * - imports에 DatabaseModule을 추가할 필요 없음
 *
 * 사용법:
 * ```typescript
 * // app.module.ts
 * @Module({
 *   imports: [DatabaseModule, ...],
 * })
 * export class AppModule {}
 *
 * // records.service.ts
 * @Injectable()
 * export class RecordsService {
 *   constructor(private readonly prisma: PrismaService) {}
 *   // DatabaseModule을 import하지 않아도 사용 가능!
 * }
 * ```
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
