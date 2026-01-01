import { Module } from '@nestjs/common';
import { RecordsController } from '../../controllers/records.controller';
import { RecordsService } from './records.service';
import { CustomLoggerService } from '../../common/logger/logger.service';

/**
 * RecordsModule
 *
 * 처방전 기록 관련 기능을 담당하는 Feature Module
 *
 * Phase 2 리팩토링:
 * - RecordsService 추가
 * - DatabaseModule은 Global이므로 자동으로 PrismaService 사용 가능
 * - ConfigModule도 Global이므로 자동으로 ConfigService 사용 가능
 *
 * TODO Phase 3:
 * - RecordsController를 이 모듈로 이동
 * - DTO 클래스 추가
 * - Entity 클래스 추가
 */
@Module({
  controllers: [RecordsController],
  providers: [RecordsService, CustomLoggerService],
  exports: [RecordsService],
})
export class RecordsModule {}
