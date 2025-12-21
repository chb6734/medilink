import "express-session";
import type { SessionUser } from "../lib/auth";

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
    googleOAuth?: {
      state: string;
      returnTo?: string;
      createdAt: number;
    };
  }
}


