# MedBridge 환경변수(로컬 개발)

> 실제 운영/테스트(원격) DB URL/비밀키는 레포에 커밋하지 않습니다.

## 1) Database

원격 DB를 사용할 경우 `DATABASE_URL`의 host/port만 바꿔주면 됩니다.
로컬 DB가 필요하면 `docker-compose.yml`의 Postgres(서비스: `helium`)을 사용하세요.

- **DATABASE_URL**

```text
postgresql://postgres:password@hyunbinhome.synology.me:5434/heliumdb?sslmode=disable
```

### 로컬 DB(docker-compose) 사용 시

```text
postgresql://postgres:password@localhost:5434/heliumdb?sslmode=disable
```

### Prisma 마이그레이션 실행 시 주의

`pnpm --filter @medbridge/db prisma:*` 스크립트는 작업 디렉터리가 `packages/db`라서,
Prisma가 읽는 `.env`도 `packages/db/.env`(또는 실행 시점의 환경변수)입니다.

- 방법 A(권장): 실행할 때 환경변수로 주입
  - `DATABASE_URL="..." pnpm --filter @medbridge/db prisma:migrate`
- 방법 B: `packages/db/.env`에 `DATABASE_URL=...` 작성(값은 커밋하지 않기)

## 2) Google Cloud Vision (OCR)

서버에서 Google Cloud Vision을 호출하려면 ADC(Application Default Credentials)가 필요합니다.

- **GOOGLE_APPLICATION_CREDENTIALS**
  - 서비스 계정 JSON 파일 경로

## 2.1 (대안) Gemini API Key 기반 멀티모달 OCR (AS-IS 호환)

Vision 대신 **Gemini(API Key)**로 이미지에서 약물 정보를 구조화(JSON)로 뽑을 수 있습니다.
이 모드는 **AS-IS 프롬프트/스키마와 동일한 형태**로 `preview-ocr` 응답에 `medications[]/hospitalName/patientCondition`을 추가합니다.

- **GEMINI_OCR_ENABLED**: `true` / `false`
- **AI_INTEGRATIONS_GEMINI_API_KEY**: Gemini API Key
- **AI_INTEGRATIONS_GEMINI_BASE_URL** (옵션)
- **AI_INTEGRATIONS_GEMINI_API_VERSION** (옵션)
- **GEMINI_OCR_MODEL** (기본: `gemini-2.5-flash`)

예시:

```env
GEMINI_OCR_ENABLED=true
AI_INTEGRATIONS_GEMINI_API_KEY=your_api_key
GEMINI_OCR_MODEL=gemini-2.5-flash
```

## 3) Gemini (Vertex AI) - optional

Gemini 요약은 기본적으로 OFF이며, 켜려면 아래 값을 설정합니다.

- **이 프로젝트의 Gemini 연동 방식**
  - 서버(`apps/api`)에서 **Vertex AI Gemini**를 사용합니다. (SDK: `@google-cloud/vertexai`)
  - 따라서 “Gemini API Key(AI Studio)” 방식이 아니라, **Google Cloud 프로젝트 + 서비스 계정(ADC)** 기반입니다.

### 3.1 사전 준비 (Google Cloud Console)
1) **Vertex AI API 활성화**
2) **서비스 계정 생성** 후 키(JSON) 다운로드
3) 서비스 계정 권한(IAM) 최소 예시:
   - **Vertex AI User** (Gemini 호출)
   - (OCR도 같이 쓰면) **Cloud Vision API User**
4) 로컬에서 ADC로 읽히도록 JSON 경로를 지정:
   - `GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account.json`

### 3.2 환경변수 (apps/api/.env.local 권장)
- **GOOGLE_CLOUD_PROJECT**
- **GOOGLE_CLOUD_LOCATION** (기본: `us-central1`)
- **GEMINI_ENABLED**: `true` / `false`
- **GEMINI_MODEL** (기본: `gemini-1.5-flash`)

예시:

```env
GOOGLE_APPLICATION_CREDENTIALS=/Users/chahyunbin/keys/medbridge-sa.json
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_ENABLED=true
GEMINI_MODEL=gemini-1.5-flash
```

> 참고: `GOOGLE_APPLICATION_CREDENTIALS`는 OCR(Vision)과 Gemini(Vertex AI)가 **같은 서비스 계정**을 공유해도 됩니다(권한만 있으면 됨).

## 4) Auth (Phase 1 skeleton)

기본값은 **OFF**입니다.

- **AUTH_ENABLED**: `true` / `false`
- **SESSION_SECRET**: 세션 서명용 문자열(운영에서는 반드시 강하게)

### 4.1 Google 로그인

#### A) (Legacy) ID Token 검증 방식

클라이언트에서 Google ID Token을 받아 서버가 검증하는 구조(골격)입니다.

- **GOOGLE_OAUTH_CLIENT_ID**

#### B) (권장) OAuth 2.0 Authorization Code Flow (커스텀 버튼)

커스텀 UI 버튼을 쓰려면 서버가 `code`를 받아 토큰으로 교환해야 해서 아래 값이 필요합니다.

- **GOOGLE_OAUTH_CLIENT_ID**
- **GOOGLE_OAUTH_CLIENT_SECRET**
- **GOOGLE_OAUTH_REDIRECT_URI** (예: `http://localhost:8787/api/auth/google/callback`)
- **WEB_ORIGIN** (옵션, returnTo allowlist. 예: `http://localhost:3000`)

#### Web (Vite) 환경변수

웹에서 Google 로그인 버튼을 띄우려면 아래 값도 필요합니다.

- **VITE_GOOGLE_CLIENT_ID** (웹에서 사용; 위 Client ID와 동일 값)

#### Web (Next.js) 환경변수

Next.js에서는 `NEXT_PUBLIC_` prefix가 붙은 값만 브라우저 번들에 노출됩니다.

- **NEXT_PUBLIC_GOOGLE_CLIENT_ID** (웹에서 사용; 위 Client ID와 동일 값)
- **NEXT_PUBLIC_API_BASE_URL** (옵션, 기본값: `http://127.0.0.1:8787`)

### 4.2 Phone 로그인(SMS OTP)

기본은 **DEV**로 OTP를 서버 로그에 출력합니다.  
운영에서는 SMS 벤더로 교체하세요.

- **SMS_PROVIDER**: `dev` (기본) / `twilio`

#### Twilio (옵션)

- **TWILIO_ACCOUNT_SID**
- **TWILIO_AUTH_TOKEN**
- **TWILIO_FROM** (발신번호)
