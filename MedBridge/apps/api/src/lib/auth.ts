import { OAuth2Client } from "google-auth-library";
import crypto from "node:crypto";

export type SessionUser = {
  id: string;
  provider: "google" | "phone";
  subject: string;
  displayName?: string;
  phoneE164?: string;
};

export function isAuthEnabled() {
  const v = (process.env.AUTH_ENABLED ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y";
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
