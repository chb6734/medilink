import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { RecordsModule } from './modules/records/records.module';
import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';
import { ShareController } from './controllers/share.controller';
import { PatientsController } from './controllers/patients.controller';
import { FacilitiesController } from './controllers/facilities.controller';
import { IntakeFormsController } from './controllers/intake-forms.controller';
import { IntakeFormsService } from './modules/intake-forms/intake-forms.service';
import { DailyCheckScheduler } from './schedulers/daily-check.scheduler';
import { AuthMiddleware } from './middleware/auth.middleware';

/**
 * AppModule
 *
 * 애플리케이션의 루트 모듈
 *
 * Phase 1 리팩토링:
 * - ConfigModule 추가: 환경 변수 타입 안전 관리
 * - DatabaseModule 추가: Prisma DI 지원
 *
 * Phase 2 리팩토링:
 * - RecordsModule 추가: Records 기능 모듈화
 *
 * TODO Phase 3:
 * - AuthModule, ShareModule, HealthModule 분리
 * - 모든 Controller를 각 Feature Module로 이동
 */
@Module({
  imports: [
    // 전역 설정 모듈
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    // 스케줄 모듈
    ScheduleModule.forRoot(),
    // 전역 데이터베이스 모듈
    DatabaseModule,
    // Feature Modules
    RecordsModule,
  ],
  controllers: [
    HealthController,
    AuthController,
    ShareController,
    PatientsController,
    FacilitiesController,
    IntakeFormsController,
  ],
  providers: [DailyCheckScheduler, IntakeFormsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('api/patients', 'api/records', 'api/intake-forms');
  }
}
