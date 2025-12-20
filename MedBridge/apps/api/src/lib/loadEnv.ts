import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Load .env from common locations without overriding already-set env vars.
// This makes local dev work even if the user places the .env at MedBridge/.env
// instead of apps/api/.env.
const here = path.dirname(new URL(import.meta.url).pathname);

const candidates = [
  // MedBridge/apps/api/.env
  path.resolve(here, "../../.env"),
  path.resolve(here, "../../.env.local"),
  // MedBridge/apps/.env (some devs prefer putting shared envs here)
  path.resolve(here, "../../../.env"),
  path.resolve(here, "../../../.env.local"),
  // MedBridge/.env
  path.resolve(here, "../../../../.env"),
  path.resolve(here, "../../../../.env.local"),
];

for (const p of candidates) {
  try {
    if (!fs.existsSync(p)) continue;
    dotenv.config({ path: p, override: false });
  } catch {
    // ignore
  }
}
