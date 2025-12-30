import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import {
  getGoogleClient,
  getGoogleOAuthClient,
  isAuthEnabled,
  randomOtpCode,
  sha256,
} from '../lib/auth';

const log = new Logger('Auth');

// Phone OTP (DEV skeleton)
const otpStore = new Map<
  string,
  { phoneE164: string; codeHash: string; expiresAt: number; tries: number }
>();

@Controller()
export class AuthController {
  @Get('/api/auth/me')
  me(@Req() req: Request) {
    console.log('🔍 /api/auth/me 호출:', {
      hasSession: !!req.session,
      sessionId: req.sessionID,
      hasUser: !!req.session?.user,
      userId: req.session?.user?.id,
      cookies: req.headers.cookie,
    });
    return {
      authEnabled: isAuthEnabled(),
      user: req.session?.user ?? null,
    };
  }

  // Google login (ID token from client)
  @Post('/api/auth/google')
  async google(@Req() req: Request, @Body() body: unknown) {
    if (!isAuthEnabled()) throw new NotFoundException('auth_disabled');

    const parsed = z.object({ idToken: z.string().min(10) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_body');

    try {
      const client = getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken: parsed.data.idToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new UnauthorizedException('invalid_token');

      req.session.user = {
        id: crypto.randomUUID(),
        provider: 'google',
        subject: payload.sub,
        displayName: payload.name ?? payload.email ?? undefined,
      };
      return { ok: true };
    } catch (e) {
      throw new UnauthorizedException(
        `google_verify_failed: ${String((e as Error)?.message ?? e)}`,
      );
    }
  }

  // Google login (Custom button) - OAuth 2.0 Authorization Code Flow
  @Get('/api/auth/google/start')
  googleStart(
    @Req() req: Request,
    @Res() res: Response,
    @Query('returnTo') returnTo?: string,
  ) {
    if (!isAuthEnabled()) throw new NotFoundException('auth_disabled');

    // Create session + state
    const state = crypto.randomUUID();
    req.session.googleOAuth = {
      state,
      returnTo: typeof returnTo === 'string' ? returnTo : undefined,
      createdAt: Date.now(),
    };

    let client;
    try {
      client = getGoogleOAuthClient();
    } catch (e) {
      // window.location.href 로 호출되는 엔드포인트라 400을 던지면 UX가 "무반응"처럼 보일 수 있음.
      // 따라서 login 화면으로 되돌리고, 쿼리로 에러를 전달합니다.
      const base =
        (typeof returnTo === 'string' && returnTo.length > 0 && returnTo) ||
        process.env.WEB_ORIGIN ||
        'http://localhost:3000/login';
      try {
        const u = new URL(base);
        u.pathname = '/login';
        u.searchParams.set('error', 'google_oauth_not_configured');
        u.searchParams.set('message', String((e as Error)?.message ?? e));
        return res.redirect(u.toString());
      } catch {
        // fallback: keep old behavior
        throw new BadRequestException(
          `google_oauth_not_configured: ${String((e as Error)?.message ?? e)}`,
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return res.redirect(url);
  }

  @Get('/api/auth/google/callback')
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: unknown,
  ) {
    if (!isAuthEnabled()) throw new NotFoundException('auth_disabled');

    const parsed = z
      .object({
        code: z.string().min(3).optional(),
        state: z.string().min(10).optional(),
        error: z.string().optional(),
        error_description: z.string().optional(),
      })
      .safeParse(query);
    if (!parsed.success) throw new BadRequestException('invalid_query');

    const { code, state, error, error_description } = parsed.data;
    if (error) {
      const msg = error_description ? `${error}: ${error_description}` : error;
      return res.status(401).send(`google_oauth_error: ${msg}`);
    }

    const saved = req.session.googleOAuth;
    if (!saved?.state || !state || saved.state !== state) {
      return res.status(401).send('google_oauth_state_mismatch');
    }

    let client;
    try {
      client = getGoogleOAuthClient();
    } catch (e) {
      return res
        .status(500)
        .send(
          `google_oauth_not_configured: ${String((e as Error)?.message ?? e)}`,
        );
    }
    if (!code) return res.status(400).send('missing_code');

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const { tokens } = await client.getToken(code);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!tokens.id_token) return res.status(401).send('missing_id_token');

      // verify id token
      const ticket = await getGoogleClient().verifyIdToken({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) return res.status(401).send('invalid_token');

      req.session.user = {
        id: crypto.randomUUID(),
        provider: 'google',
        subject: payload.sub,
        displayName: payload.name ?? payload.email ?? undefined,
      };
      req.session.googleOAuth = undefined;

      // 세션 저장 후 리다이렉트 (세션이 저장되기 전에 리다이렉트되면 쿠키가 전송되지 않음)
      req.session.save((err) => {
        if (err) {
          console.error('세션 저장 오류:', err);
          return res.status(500).send('session_save_error');
        }

        const fallback = `${req.protocol}://${req.hostname}:3000/`;
        const candidate = saved.returnTo;
        let dest = fallback;
        if (candidate) {
          try {
            const u = new URL(candidate);
            const allowOrigin = process.env.WEB_ORIGIN;
            if (allowOrigin && candidate.startsWith(allowOrigin)) {
              dest = candidate;
            } else if (u.hostname === req.hostname && u.port === '3000') {
              dest = candidate;
            }
          } catch {
            // ignore
          }
        }

        return res.redirect(dest);
      });
    } catch (e) {
      return res
        .status(401)
        .send(
          `google_oauth_exchange_failed: ${String((e as Error)?.message ?? e)}`,
        );
    }
  }

  // Phone OTP (DEV skeleton)
  @Post('/api/auth/phone/start')
  async phoneStart(@Body() body: unknown) {
    if (!isAuthEnabled()) throw new NotFoundException('auth_disabled');

    const parsed = z
      .object({ phoneE164: z.string().min(8).max(20) })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_body');

    const challengeId = crypto.randomUUID();
    const code = randomOtpCode();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(challengeId, {
      phoneE164: parsed.data.phoneE164,
      codeHash: sha256(code),
      expiresAt,
      tries: 0,
    });

    // SMS provider (default: dev)
    const provider = (process.env.SMS_PROVIDER ?? 'dev').toLowerCase();
    if (provider === 'dev') {
      // DEV: print OTP to server log. Replace with SMS vendor in production.
      log.warn(`DEV_OTP_CODE phone=${parsed.data.phoneE164} code=${code}`);
    } else if (provider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM;
      if (!accountSid || !authToken || !from) {
        throw new UnauthorizedException('sms_provider_not_configured');
      }
      // Lazy import to keep dev footprint light
      const { default: twilio } = await import('twilio');
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        to: parsed.data.phoneE164,
        from,
        body: `[MedBridge] 인증번호: ${code} (5분 내 입력)`,
      });
    } else {
      throw new UnauthorizedException('unsupported_sms_provider');
    }

    return { challengeId, expiresAt };
  }

  @Post('/api/auth/phone/verify')
  phoneVerify(@Req() req: Request, @Body() body: unknown) {
    if (!isAuthEnabled()) throw new NotFoundException('auth_disabled');

    const parsed = z
      .object({
        challengeId: z.string().uuid(),
        code: z.string().min(4).max(10),
      })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_body');

    const entry = otpStore.get(parsed.data.challengeId);
    if (!entry) throw new NotFoundException('challenge_not_found');
    if (Date.now() > entry.expiresAt)
      throw new UnauthorizedException('challenge_expired');

    entry.tries += 1;
    if (entry.tries > 5) throw new UnauthorizedException('too_many_tries');

    if (sha256(parsed.data.code) !== entry.codeHash) {
      throw new UnauthorizedException('invalid_code');
    }

    req.session.user = {
      id: crypto.randomUUID(),
      provider: 'phone',
      subject: entry.phoneE164,
      phoneE164: entry.phoneE164,
    };
    otpStore.delete(parsed.data.challengeId);

    // 세션 저장 후 응답
    return new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('세션 저장 오류:', err);
          reject(new Error('session_save_error'));
        } else {
          resolve({ ok: true });
        }
      });
    });
  }

  @Post('/api/auth/logout')
  logout(@Req() req: Request) {
    if (req.session) req.session.user = undefined;
    return { ok: true };
  }
}
