import '../src/lib/loadEnv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import express from 'express';
import { logGeminiOcrConfig } from '../src/lib/genaiOcr';

let cachedApp: any = null;

async function createApp() {
  if (cachedApp) {
    return cachedApp;
  }

  logGeminiOcrConfig();

  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: ['log', 'warn', 'error'],
    }
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(cookieParser());

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
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  await app.init();
  cachedApp = expressApp;
  return expressApp;
}

export default async (req: any, res: any) => {
  const app = await createApp();
  return app(req, res);
};
