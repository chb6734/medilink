import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { PrismaService } from '../database/prisma.service';

declare global {
  namespace Express {
    interface Request {
      patientId?: string;
      userId?: string;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly db: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.['auth_token'];

    if (!token) {
      return next();
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next();
    }

    // Set userId from JWT
    req.userId = payload.userId;

    // Find or create patient record linked to this auth user
    try {
      let patient = await this.db.patient.findFirst({
        where: {
          authProvider: payload.provider,
          authSubject: payload.subject,
        },
        select: { id: true },
      });

      if (!patient) {
        // Create patient record for this auth user
        patient = await this.db.patient.create({
          data: {
            authProvider: payload.provider,
            authSubject: payload.subject,
            name: payload.displayName, // OAuth 로그인 시 이름 저장
          },
          select: { id: true },
        });
        console.log('✅ 새 환자 레코드 생성:', {
          patientId: patient.id,
          provider: payload.provider,
          name: payload.displayName,
        });
      }

      req.patientId = patient.id;
    } catch (error) {
      console.error('❌ 환자 조회/생성 실패:', error);
    }

    next();
  }
}
