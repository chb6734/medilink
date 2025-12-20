import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import {
  getGoogleClient,
  isAuthEnabled,
  randomOtpCode,
  sha256,
} from "../lib/auth";

const log = new Logger("Auth");

// Phone OTP (DEV skeleton)
const otpStore = new Map<
  string,
  { phoneE164: string; codeHash: string; expiresAt: number; tries: number }
>();

@Controller()
export class AuthController {
  @Get("/api/auth/me")
  me(@Req() req: Request) {
    return {
      authEnabled: isAuthEnabled(),
      user: req.session?.user ?? null,
    };
  }

  // Google login (ID token from client)
  @Post("/api/auth/google")
  async google(@Req() req: Request, @Body() body: unknown) {
    if (!isAuthEnabled()) throw new NotFoundException("auth_disabled");

    const parsed = z.object({ idToken: z.string().min(10) }).safeParse(body);
    if (!parsed.success) throw new UnauthorizedException("invalid_body");

    try {
      const client = getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken: parsed.data.idToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new UnauthorizedException("invalid_token");

      req.session.user = {
        id: crypto.randomUUID(),
        provider: "google",
        subject: payload.sub,
        displayName: payload.name ?? payload.email ?? undefined,
      };
      return { ok: true };
    } catch (e) {
      throw new UnauthorizedException(
        `google_verify_failed: ${String((e as any)?.message ?? e)}`,
      );
    }
  }

  // Phone OTP (DEV skeleton)
  @Post("/api/auth/phone/start")
  async phoneStart(@Body() body: unknown) {
    if (!isAuthEnabled()) throw new NotFoundException("auth_disabled");

    const parsed = z
      .object({ phoneE164: z.string().min(8).max(20) })
      .safeParse(body);
    if (!parsed.success) throw new UnauthorizedException("invalid_body");

    const challengeId = crypto.randomUUID();
    const code = randomOtpCode();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(challengeId, {
      phoneE164: parsed.data.phoneE164,
      codeHash: sha256(code),
      expiresAt,
      tries: 0,
    });

    // DEV: print OTP to server log. Replace with SMS vendor in production.
    log.warn(`DEV_OTP_CODE phone=${parsed.data.phoneE164} code=${code}`);

    return { challengeId, expiresAt };
  }

  @Post("/api/auth/phone/verify")
  async phoneVerify(@Req() req: Request, @Body() body: unknown) {
    if (!isAuthEnabled()) throw new NotFoundException("auth_disabled");

    const parsed = z
      .object({ challengeId: z.string().uuid(), code: z.string().min(4).max(10) })
      .safeParse(body);
    if (!parsed.success) throw new UnauthorizedException("invalid_body");

    const entry = otpStore.get(parsed.data.challengeId);
    if (!entry) throw new NotFoundException("challenge_not_found");
    if (Date.now() > entry.expiresAt) throw new UnauthorizedException("challenge_expired");

    entry.tries += 1;
    if (entry.tries > 5) throw new UnauthorizedException("too_many_tries");

    if (sha256(parsed.data.code) !== entry.codeHash) {
      throw new UnauthorizedException("invalid_code");
    }

    req.session.user = {
      id: crypto.randomUUID(),
      provider: "phone",
      subject: entry.phoneE164,
      phoneE164: entry.phoneE164,
    };
    otpStore.delete(parsed.data.challengeId);
    return { ok: true };
  }

  @Post("/api/auth/logout")
  logout(@Req() req: Request) {
    if (req.session) req.session.user = undefined;
    return { ok: true };
  }
}


