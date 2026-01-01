import './lib/loadEnv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { logGeminiOcrConfig } from './lib/genaiOcr';
import { CustomLoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // 환경변수 로드 후 Gemini OCR 설정 출력
  logGeminiOcrConfig();
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  // Global Exception Filter 적용
  const logger = new CustomLoggerService();
  logger.setContext('AllExceptionsFilter');
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  console.log('🔧 환경 설정:', {
    NODE_ENV: process.env.NODE_ENV,
    isProduction,
    frontendUrl,
    authMethod: 'JWT + HttpOnly Cookie',
  });

  app.enableCors({
    origin: isProduction ? [frontendUrl, /\.vercel\.app$/] : true,
    credentials: true,
  });

  // Cookie parser for JWT cookies
  app.use(cookieParser());

  // 요청 로깅 (디버깅용)
  app.use((req, res, next) => {
    console.log(`\n📥 요청 받음: ${req.method} ${req.path}`);
    console.log('쿠키:', req.headers.cookie || '없음');
    next();
  });

  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}
bootstrap();
