# MediLink

PRD/Tech Spec 기반 MVP 데모 구현 (처방전/조제내역서 기반 연속진료 요약).

## 구조
- `apps/web`: Vite + React (환자 앱/의료진 열람 UI)
- `apps/api`: Fastify API (OCR, 공유 토큰, Auth skeleton)
- `packages/db`: Prisma schema (옵션, DB 붙일 때)

## 실행 (로컬)
### 1) 설치

```bash
cd MedBridge
pnpm install
```

### 2) API 실행

```bash
cd MedBridge
pnpm -C apps/api dev
```

기본 포트: `8787`

### 3) Web 실행

```bash
cd MedBridge
pnpm -C apps/web dev --host 127.0.0.1 --port 5173
```

Web: `http://127.0.0.1:5173/`

## 개발 모드 폴백(설정 없이도 데모 가능)
- DB(`DATABASE_URL`)가 없고 `NODE_ENV !== production`이면:
  - 서버는 **in-memory 저장소**로 `/api/records`, `/api/share-tokens`, `/share/:token` 데모 동작
- Vision OCR 자격증명이 없으면:
  - dev 모드에서 OCR 결과는 “미설정 placeholder”로 폴백

## Auth (Phase 1 skeleton)
- 기본은 OFF: `AUTH_ENABLED=false`
- 켜면 `/api/records`, `/api/share-tokens`는 로그인 필요(401)
- Web에서 `/#/login`으로 로그인 화면 진입

### Phone OTP (DEV)
- `/api/auth/phone/start` 호출 시 OTP는 서버 로그에 `DEV_OTP_CODE`로 출력됨.

## GCP 연동(추후)
- Vision: `GOOGLE_APPLICATION_CREDENTIALS`
- Gemini(VertexAI): `GOOGLE_CLOUD_PROJECT`, `GEMINI_ENABLED=true` 등 (`ENVIRONMENT.md` 참고)


