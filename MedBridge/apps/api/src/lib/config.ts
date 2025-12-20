export const useInMemoryStore =
  !process.env.DATABASE_URL && process.env.NODE_ENV !== "production";

// Dev-safe guard: avoid constructing Vision client unless explicitly configured.
export const visionEnabled =
  process.env.VISION_ENABLED === "true" ||
  !!process.env.GOOGLE_APPLICATION_CREDENTIALS;


