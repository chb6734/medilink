import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';
import { RecordsController } from './controllers/records.controller';
import { ShareController } from './controllers/share.controller';

/**
 * AppModule
 *
 * 애플리케이션의 루트 모듈
 *
 * Phase 1 리팩토링:
 * - ConfigModule 추가: 환경 변수 타입 안전 관리
 * - DatabaseModule 추가: Prisma DI 지원
 *
 * TODO Phase 2:
 * - Feature Module 분리 (RecordsModule, AuthModule, etc.)
 */
@Module({
  imports: [
    // 전역 설정 모듈
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    // 전역 데이터베이스 모듈
    DatabaseModule,
  ],
  controllers: [
    HealthController,
    AuthController,
    RecordsController,
    ShareController,
  ],
  providers: [],
})
export class AppModule {}
