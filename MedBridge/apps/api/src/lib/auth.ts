import type { FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { OAuth2Client } from "google-auth-library";
import crypto from "node:crypto";

declare module "fastify" {
  interface Session {
    user?: {
      id: string;
      provider: "google" | "phone";
      subject: string;
      displayName?: string;
      phoneE164?: string;
    };
  }
}

export function isAuthEnabled() {
  return process.env.AUTH_ENABLED === "true";
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(cookie);
  await app.register(session, {
    secret:
      process.env.SESSION_SECRET ??
      "dev-only-secret-change-me-dev-only-secret-change-me",
    cookieName: "mb.sid",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // dev
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // seconds
    },
    saveUninitialized: false,
  });
}

export function requireAuth(request: any, reply: any) {
  if (!isAuthEnabled()) return true;
  if (!request.session?.user) {
    reply.code(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
}

export function getGoogleClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID");
  }
  return new OAuth2Client(clientId);
}

export function randomOtpCode() {
  // 6-digit numeric OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}


