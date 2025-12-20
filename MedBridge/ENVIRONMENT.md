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
클라이언트에서 Google ID Token을 받아 서버가 검증하는 구조(골격)입니다.

- **GOOGLE_OAUTH_CLIENT_ID**

### 4.2 Phone 로그인(SMS OTP)
현재는 **DEV 골격**으로, OTP를 서버 로그에 출력합니다.  
운영에서는 SMS 벤더로 교체하세요.


