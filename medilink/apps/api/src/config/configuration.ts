/**
 * Configuration Factory
 *
 * 환경 변수를 타입 안전하게 관리하는 설정 객체
 *
 * 사용법:
 * ```typescript
 * @Injectable()
 * export class SomeService {
 *   constructor(private readonly config: ConfigService) {}
 *
 *   someMethod() {
 *     const port = this.config.get<number>('server.port'); // 타입 안전!
 *     const dbUrl = this.config.get<string>('database.url');
 *   }
 * }
 * ```
 */
export default () => ({
  server: {
    port: parseInt(process.env.PORT ?? '8787', 10),
    host: process.env.HOST ?? '0.0.0.0',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },

  frontend: {
    url: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },

  database: {
    url: process.env.DATABASE_URL,
    useInMemory: process.env.USE_IN_MEMORY_STORE === 'true',
  },

  session: {
    secret: process.env.SESSION_SECRET ?? 'dev-only-secret-change-me-dev-only-secret-change-me',
    cookieDomain: process.env.COOKIE_DOMAIN,
  },

  ocr: {
    geminiEnabled: process.env.GEMINI_OCR_ENABLED === 'true',
    visionEnabled: process.env.GOOGLE_CLOUD_VISION_ENABLED !== 'false',
  },

  auth: {
    enabled: process.env.AUTH_ENABLED !== 'false',
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    },
    sms: {
      provider: process.env.SMS_PROVIDER ?? 'dev',
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_FROM,
      },
    },
  },

  ai: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
    },
    vertex: {
      projectId: process.env.VERTEX_AI_PROJECT_ID,
      location: process.env.VERTEX_AI_LOCATION ?? 'us-central1',
    },
  },
});
