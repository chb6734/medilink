import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

// Load .env from common locations without overriding already-set env vars.
// This keeps local dev flexible (repo root, MedBridge root, or apps/api/.env).

function tryLoad(p: string) {
  try {
    if (!fs.existsSync(p)) return;
    dotenv.config({ path: p, override: false });
  } catch {
    // ignore
  }
}

const cwd = process.cwd();
const candidates = [
  // current working directory
  path.resolve(cwd, ".env"),
  path.resolve(cwd, ".env.local"),
  // common monorepo locations
  path.resolve(cwd, "apps/api/.env"),
  path.resolve(cwd, "apps/api/.env.local"),
  path.resolve(cwd, "apps/.env"),
  path.resolve(cwd, "apps/.env.local"),
  // walking up a few levels
  path.resolve(cwd, "../.env"),
  path.resolve(cwd, "../.env.local"),
  path.resolve(cwd, "../../.env"),
  path.resolve(cwd, "../../.env.local"),
  path.resolve(cwd, "../../../.env"),
  path.resolve(cwd, "../../../.env.local"),
];

for (const p of candidates) tryLoad(p);
