# MedBridge 환경변수(로컬 개발)

> 실제 운영/테스트(원격) DB URL/비밀키는 레포에 커밋하지 않습니다.

## 1) Database

로컬 개발은 `docker-compose.yml`의 Postgres(서비스: `helium`)을 사용합니다.

- **DATABASE_URL**

```text
postgresql://postgres:password@localhost:5432/heliumdb?sslmode=disable
```

## 2) Google Cloud Vision (OCR)

서버에서 Google Cloud Vision을 호출하려면 ADC(Application Default Credentials)가 필요합니다.

- **GOOGLE_APPLICATION_CREDENTIALS**
  - 서비스 계정 JSON 파일 경로

## 3) Gemini (Vertex AI) - optional

Gemini 요약은 기본적으로 OFF이며, 켜려면 아래 값을 설정합니다.

- **GOOGLE_CLOUD_PROJECT**
- **GOOGLE_CLOUD_LOCATION** (기본: `us-central1`)
- **GEMINI_ENABLED**: `true` / `false`
- **GEMINI_MODEL** (기본: `gemini-1.5-flash`)

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
