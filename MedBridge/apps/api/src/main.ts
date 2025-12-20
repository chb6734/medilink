import "./lib/loadEnv";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import session from "express-session";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ["log", "warn", "error"] });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(cookieParser());
  app.use(
    session({
      name: "mb.sid",
      secret:
        process.env.SESSION_SECRET ??
        "dev-only-secret-change-me-dev-only-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // dev
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen(port, host);
}
bootstrap();
