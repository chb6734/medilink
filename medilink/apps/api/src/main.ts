import './lib/loadEnv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { logGeminiOcrConfig } from './lib/genaiOcr';

async function bootstrap() {
  // 환경변수 로드 후 Gemini OCR 설정 출력
  logGeminiOcrConfig();
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  app.enableCors({
    origin: isProduction ? [frontendUrl, /\.vercel\.app$/] : true,
    credentials: true,
  });

  app.use(cookieParser());

  // 세션 미들웨어 전에 요청 로깅 (디버깅용)
  app.use((req, res, next) => {
    console.log(`\n📥 요청 받음: ${req.method} ${req.path}`);
    console.log('쿠키:', req.headers.cookie || '없음');
    next();
  });

  app.use(
    session({
      name: 'mb.sid',
      secret:
        process.env.SESSION_SECRET ??
        'dev-only-secret-change-me-dev-only-secret-change-me',
      resave: true,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax', // 프로덕션에서는 크로스 도메인 허용
        secure: isProduction, // 프로덕션에서는 HTTPS 필수
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  // 모든 요청에서 세션을 강제로 저장하도록 유도 (Express 세션 유실 방지 트릭)
  app.use((req, res, next) => {
    if (req.session && req.method !== 'GET') {
      const originalEnd = res.end;
      res.end = function (...args: any[]) {
        req.session.save(() => {
          originalEnd.apply(res, args);
        });
      } as any;
    }
    next();
  });

  // 세션 미들웨어 후 세션 상태 로깅 (디버깅용)
  app.use((req, res, next) => {
    if (req.session) {
      console.log('세션 상태:', {
        sessionId: req.sessionID,
        hasUser: !!req.session.user,
        userId: req.session.user?.id,
      });
    } else {
      console.log('세션 없음');
    }
    next();
  });

  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}
bootstrap();
