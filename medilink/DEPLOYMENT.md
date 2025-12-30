# MediLink 배포 가이드

## 배포 전략

MediLink는 두 가지 방법으로 배포할 수 있습니다:

### 방법 1: 권장 방법 (프론트엔드 Vercel + 백엔드 Railway/Render)

프론트엔드는 Vercel에, 백엔드는 Railway 또는 Render에 배포하는 방법입니다.
이 방법은 세션 관리와 장시간 실행이 필요한 NestJS 백엔드에 적합합니다.

#### 1-1. 백엔드 배포 (Railway 사용)

1. [Railway](https://railway.app)에 가입
2. 새 프로젝트 생성
3. GitHub 저장소 연결
4. Root Directory를 `apps/api`로 설정
5. 환경 변수 설정 (아래 "백엔드 환경 변수" 섹션 참고)
6. 배포 완료 후 백엔드 URL 복사 (예: `https://medilink-api-production.up.railway.app`)

#### 1-2. 백엔드 배포 (Render 사용)

1. [Render](https://render.com)에 가입
2. "New +" → "Web Service" 선택
3. GitHub 저장소 연결
4. 설정:
   - **Name**: medilink-api
   - **Root Directory**: `apps/api`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @medilink/db build && pnpm --filter @medilink/api build`
   - **Start Command**: `pnpm start:prod`
5. 환경 변수 설정 (아래 "백엔드 환경 변수" 섹션 참고)
6. 배포 완료 후 백엔드 URL 복사 (예: `https://medilink-api.onrender.com`)

#### 1-3. 프론트엔드 배포 (Vercel)

1. [Vercel](https://vercel.com)에 가입
2. "Add New..." → "Project" 선택
3. GitHub 저장소 연결
4. Framework Preset: **Next.js** 선택
5. Root Directory: `apps/web` 설정
6. 환경 변수 설정:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.railway.app
   ```
   (Railway 또는 Render에서 복사한 백엔드 URL 입력)
7. Deploy 클릭

### 방법 2: 모두 Vercel에 배포 (실험적)

**⚠️ 주의**: 이 방법은 다음과 같은 제한사항이 있습니다:
- Serverless function 실행 시간 제한 (10초)
- 메모리 세션 관리 불가 (각 요청마다 초기화됨)
- 프로덕션 환경에는 권장하지 않음

#### 2-1. 백엔드 Vercel 배포

1. [Vercel](https://vercel.com)에 가입
2. 새 프로젝트 생성
3. GitHub 저장소 연결
4. Root Directory: `apps/api` 설정
5. 환경 변수 설정 (아래 "백엔드 환경 변수" 섹션 참고)
6. Deploy 클릭
7. 배포 완료 후 URL 복사

#### 2-2. 프론트엔드 Vercel 배포

방법 1-3과 동일

---

## 환경 변수 설정

### 백엔드 환경 변수

다음 환경 변수들을 배포 플랫폼에 설정해야 합니다:

#### 필수 환경 변수

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Session
SESSION_SECRET=your-random-secret-key-here

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_OAUTH_REDIRECT_URI=https://your-api-url.com/api/auth/google/callback

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# Gemini AI
AI_INTEGRATIONS_GEMINI_API_KEY=your-gemini-api-key
GEMINI_ENABLED=true
GEMINI_MODEL=gemini-2.5-flash
GEMINI_OCR_ENABLED=true
GEMINI_OCR_MODEL=gemini-2.5-flash

# Node Environment
NODE_ENV=production
PORT=8787
```

#### Google Application Credentials 설정

Render/Railway에서는 JSON 파일을 직접 업로드할 수 없으므로, 다음 방법 중 하나를 사용:

**방법 A: Base64 인코딩** (권장)

1. 로컬에서 credentials JSON을 base64로 인코딩:
   ```bash
   base64 -i /path/to/credentials.json
   ```
2. 환경 변수 추가:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS_BASE64=<base64-encoded-string>
   ```
3. `apps/api/src/lib/loadEnv.ts` 파일 수정:
   ```typescript
   if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
     const credentials = Buffer.from(
       process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
       'base64'
     ).toString('utf-8');

     const credPath = '/tmp/gcp-credentials.json';
     fs.writeFileSync(credPath, credentials);
     process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
   }
   ```

**방법 B: Application Default Credentials (ADC)**

Google Cloud에서 실행하는 경우 자동으로 인증됩니다.

### 프론트엔드 환경 변수

```bash
# API Base URL
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com
```

---

## 배포 후 확인사항

### 1. Google OAuth Redirect URI 업데이트

[Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서:
1. OAuth 2.0 클라이언트 ID 선택
2. "승인된 리디렉션 URI"에 추가:
   ```
   https://your-backend-url.com/api/auth/google/callback
   ```

### 2. CORS 설정 확인

백엔드 `apps/api/src/main.ts`의 CORS 설정이 프론트엔드 도메인을 허용하는지 확인:

```typescript
app.enableCors({
  origin: [
    'https://your-frontend-url.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
});
```

### 3. 세션 쿠키 설정 (프로덕션)

`apps/api/src/main.ts`의 세션 설정 수정:

```typescript
session({
  cookie: {
    httpOnly: true,
    sameSite: 'none', // 프론트엔드와 백엔드 도메인이 다른 경우
    secure: true,      // HTTPS 필수
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
})
```

### 4. Database 마이그레이션

배포 후 데이터베이스 마이그레이션 실행:

```bash
# Railway/Render에서는 빌드 시 자동 실행되도록 설정 가능
cd packages/db
pnpm prisma migrate deploy
```

---

## 로컬 개발 환경

로컬에서 테스트하려면:

```bash
# 백엔드 실행
pnpm dev:api

# 프론트엔드 실행 (다른 터미널)
pnpm dev
```

---

## 트러블슈팅

### 1. 세션이 유지되지 않음

- CORS 설정 확인
- 쿠키 설정의 `sameSite`와 `secure` 옵션 확인
- 프론트엔드에서 `credentials: 'include'` 설정 확인

### 2. Google OAuth 실패

- Redirect URI가 정확히 일치하는지 확인
- Client ID와 Secret이 올바른지 확인

### 3. Gemini API 오류

- API Key가 올바른지 확인
- Google Cloud 프로젝트에서 Vertex AI API가 활성화되어 있는지 확인

### 4. Database 연결 오류

- DATABASE_URL에 `?sslmode=require` 추가 (프로덕션)
- IP 화이트리스트 확인 (필요한 경우)

---

## 추가 리소스

- [Vercel 문서](https://vercel.com/docs)
- [Railway 문서](https://docs.railway.app)
- [Render 문서](https://render.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [NestJS 배포 가이드](https://docs.nestjs.com/deployment)
