import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

app.get("/health", async () => ({ ok: true }));

// TODO: Implement
// - POST /api/records/preview-ocr
// - POST /api/records
// - POST /api/share-tokens
// - GET  /share/:token
// - POST /api/reminders

await app.listen({ port: PORT, host: HOST });


