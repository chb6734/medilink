# 기술 스펙(Tech Spec): 처방전/조제내역서 기반 Care Continuity (MVP → 확장)

> 작성자 관점: `personas/tpm.md` (Alex TPM)  
> 기준 문서: `docs/prd/prd_prescription_based_continuity.md`, `docs/specs/mvp_spec_prescription_based_continuity.md`, `docs/meeting_notes/2025-12-18_med_continuity_prescription_based.md`

## 0) 목표/원칙(비기능 요구사항)

- **Security/Privacy by default**
  - 원본 이미지 **서버 무저장**: 업로드 → 즉시 OCR → 즉시 삭제
  - 접근은 **짧은 TTL 토큰(10분)** 기반, TTL 내 재열람 허용
- **Senior-friendly UX**를 기술로 뒷받침
  - 느린 네트워크/저사양 기기에서도 동작(업로드 재시도/진행 표시/부분 저장)
- **MVP는 단순함**
  - 약품명 정규화는 **OCR 원문 그대로(A안)**, 성분/제품명 매핑은 Phase 1
- **의료기기(SaMD) 회피**
  - 질환/진단 후보 추정 출력 금지, “확인 필요(verify)”만 표시

## 1) 시스템 개요(논리 아키텍처)

### 1.1 컴포넌트

- **Web App (Patient UI)**
  - 조제내역서 촬영/업로드, “현재 복용중” 요약, 복약 알림 설정, 대기실 설문, QR 생성
- **Clinician Viewer (No-login MVP)**
  - 1장 요약 + 원문 펼치기, TTL 토큰으로만 접근
- **API Server**
  - 업로드/추출/저장/조회/토큰 발급/검증
- **OCR Worker**
  - 업로드된 이미지를 받아 OCR 수행 후 원본 즉시 삭제
  - 실패 시 재시도/백오프
- **DB (PostgreSQL)**
  - 환자 기록, OCR 결과, 알림, 접근 로그, (Phase 1) 세션 스토어
- **Object Storage (선택)**
  - 원본 이미지 장기 저장 금지
  - 단, “업로드 직후 OCR 처리”에서 임시 저장이 필요하다면 **짧은 TTL의 임시 버킷**(수 분) + 강제 삭제 정책

### 1.2 데이터 흐름(무저장 OCR)

1. 클라이언트가 이미지 업로드 (multipart)
2. API는 임시 저장(메모리/임시 스토리지) 후 OCR Worker 호출
3. OCR Worker가 텍스트/신뢰도/필드 추출
4. Worker가 **원본 이미지를 즉시 삭제**
5. API가 DB에 “추출 결과(텍스트/필드/신뢰도)”만 저장

## 2) 핵심 도메인 모델(데이터 모델 초안)

> MVP는 “환자 인증 없음”도 가능하므로, `patient_id`는 익명(디바이스/랜덤 UUID)로 시작하고 Phase 1에 계정으로 연결.

### 2.1 테이블(요약)

- `patients`
  - `id (uuid)`
  - `created_at`
  - (Phase 1) `auth_provider`, `auth_subject`
- `facilities`
  - `id (uuid)`
  - `name`
  - `type` (clinic/hospital/pharmacy/unknown)
- `prescription_records` (Quick Prescription Recording 포함)
  - `id (uuid)`
  - `patient_id`
  - `facility_id` (nullable)
  - `record_type` (dispensing_record/prescription)
  - `chief_complaint` (nullable)
  - `doctor_diagnosis` (nullable, Phase 1: `doctorDiagnosis`)
  - `note_doctor_said` (nullable) // “의사가 말한 요지”(환자 작성)
  - `prescribed_at` (nullable)
  - `dispensed_at` (nullable)
  - `created_at`
- `ocr_extractions`
  - `id (uuid)`
  - `prescription_record_id`
  - `raw_text` (text)
  - `fields_json` (jsonb) // meds list, dates, dosage, etc.
  - `confidence_json` (jsonb) // per-field confidence
  - `overall_confidence` (float)
  - `created_at`
- `med_items`
  - `id (uuid)`
  - `prescription_record_id`
  - `name_raw` (text) // MVP: OCR raw string
  - `dose` (text, nullable)
  - `frequency` (text, nullable)
  - `duration_days` (int, nullable)
  - `confidence` (float, nullable)
  - `needs_verification` (bool) // < 0.8 등
- `intake_forms`
  - `id (uuid)`
  - `patient_id`
  - `facility_id` (nullable)
  - `chief_complaint`
  - `onset_at` (date or text)
  - `course` (enum: improving/worsening/no_change + free text)
  - `adherence` (enum + reason)
  - `adverse_events` (text)
  - `allergies` (text)
  - `created_at`
- `share_tokens`
  - `id (uuid)`
  - `patient_id`
  - `facility_id` (nullable)
  - `expires_at` (timestamp) // now+10m
  - `revoked_at` (timestamp nullable)
  - `created_at`
- `access_logs`
  - `id (uuid)`
  - `share_token_id`
  - `accessed_at`
  - `ip_hash` (optional)
  - `user_agent_hash` (optional)
- `reminders` (MVP: 복약 알림)
  - `id (uuid)`
  - `patient_id`
  - `med_name_raw`
  - `schedule_json` (jsonb) // times, timezone
  - `enabled` (bool)
  - `created_at`
- `reminder_events` (MVP/Phase1 선택)
  - `id (uuid)`
  - `reminder_id`
  - `scheduled_at`
  - `status` (sent/acknowledged/skipped)
  - (선택) `note` (Phase 1)

## 3) API 설계(초안)

> 인증 없는 MVP 기준. Phase 1에서 세션/로그인 추가.

### 3.1 업로드/OCR

- `POST /api/records/preview-ocr`
  - 입력: image file (+ record_type)
  - 출력: meds/fields/confidence (저장 전 미리보기)
  - 원본: 처리 후 즉시 삭제
- `POST /api/records`
  - 입력: image file + 메타(선택: facility_name, chief_complaint, doctor_diagnosis, prescribed_at, dispensed_at)
  - 동작: OCR 수행 → DB 저장(텍스트/필드만)
  - 출력: `prescription_record_id`

### 3.2 환자 화면 데이터

- `GET /api/patients/me/summary?range=90d`
  - 출력: “현재 복용중” + 약력 타임라인 + needs_verification 목록
- `POST /api/reminders`
  - 입력: med + schedule
- `PATCH /api/reminders/:id`
  - enabled 토글

### 3.3 대기실 설문

- `POST /api/intake`
  - 입력: 설문 응답 + facility_id
- `GET /api/intake/:id`

### 3.4 공유(의료진 열람)

- `POST /api/share-tokens`
  - 입력: (선택) facility_id, range=90d
  - 출력: token + expires_at (10분)
  - 재발급: 환자만 가능 → 기존 토큰 revoke
- `GET /share/:token`
  - 출력: clinician one-page summary
  - 규칙: TTL 내 재열람 허용, TTL 만료 시 410/404

## 4) 보안/프라이버시 구현 디테일

### 4.1 이미지 무저장 보장

- 업로드 파일은 **임시 경로**에만 존재
- OCR 완료 후:
  - 로컬 임시파일 즉시 삭제
  - (스토리지 사용 시) TTL bucket + 삭제 API 호출 + lifecycle rule(backup)
  - 삭제 성공 여부를 로그/메트릭으로 남김

### 4.2 토큰 정책

- TTL: **10분**
- 재열람: TTL 내 허용
- 재발급: 환자만 가능, 재발급 시 기존 토큰 즉시 revoke
- 토큰 저장:
  - DB에는 토큰 원문 대신 **해시 저장**(권장)

### 4.3 감사/로그

- 최소: `share_token_id`, `accessed_at` 기록
- PII 최소화: IP/UA는 원문 저장 대신 해시(또는 미저장)

## 5) OCR 정확도/신뢰도 UX 매핑

- `confidence < 0.80` → “검증 필요” 뱃지(Phase 1 강화)
- 불확실 항목은 “확인 필요” 리스트로 요약에 노출
- OCR 실패 시:
  - 사용자에게 재촬영 가이드(밝기/각도/흔들림)
  - 서버측 재시도(최대 N회) 후 명확한 에러 메시지

## 6) 복약 알림(현재 훅 A+C) 구현 메모

- 첫 결과 화면에서 “현재 복용중”을 보여준 직후, **원탭 알림 설정**
- 알림은 앱 푸시(모바일) 또는 웹 푸시(가능 시)로 시작
- “복용함/안함” 체크는 MVP에서 최소화 가능(Phase 1에서 이벤트/메모 강화)

## 7) Phase 1 확장(PRD 11.x 반영)

### 7.1 인증

- **Google 로그인(OAuth)** + **휴대폰 로그인(SMS OTP)** 지원
- 세션 스토어: Postgres
- 비로그인 랜딩 분리
  - 로그인 없이도 “의사에게 보여주기(토큰)” 기반 흐름은 유지 가능(정책에 따라 제한)

#### 구현 메모(Phase 1)

- Google: OAuth 2.0 / OIDC, `sub` 기반 사용자 식별
- Phone: SMS OTP(6자리) + rate limit + 재시도/쿨다운
  - SMS 벤더는 지역/비용/신뢰도를 고려해 선택(예: Twilio, NCP SENS 등)
- 세션: 서버 세션 + Postgres 세션 스토어(만료/로그아웃)

## 7.6 AI 선택(무저장 OCR + 요약/분류)

> “진단/질환 추정”은 금지. AI는 **문서 OCR/정리/요약**에만 사용.

### 7.6.1 OCR(권장 1순위)

- **Google Cloud Vision OCR** (권장)
  - 장점: 인쇄물 인식 성능/안정성, 한국어 문서 처리 경험, API 운영 편의
  - 적용: 업로드 직후 OCR → 결과만 저장(이미지 즉시 삭제)

### 7.6.2 OCR 대안(옵션)

- **Naver CLOVA OCR**
  - 장점: 한국어 문서 인식/커스텀 템플릿에 강점, 국내 운영 선호 시 유리
- **AWS Textract / Azure OCR**
  - 장점: 기존 클라우드 스택이 AWS/Azure일 때 통합 편의

### 7.6.3 LLM(선택, MVP에는 optional)

- 모델/벤더(확정): **Google Gemini**
- 용도:
  - 환자 자유서술을 “의사용 요약”으로 압축(출처 라벨 유지)
  - `chiefComplaint` 카테고리 분류(증상군 선택 보조)
  - “약사에게 확인할 질문/주의 체크리스트” 템플릿 생성(Phase 1 OTC 보조)
- 권장 접근:
  - 프롬프트에 **의료적 판단/진단 금지** 룰을 명시
  - 출력은 “정보 정리/확인 질문” 형태로만 제한
  - 실패/환각 대비: 원문 펼치기 + “환자 작성/AI 요약” 라벨 분리

### 7.2 Quick Prescription Recording

- 3-step: 업로드→OCR 검토→메타 입력
- `preview-ocr` API 필수

### 7.3 증상별 과거 기록 조회

- `chiefComplaint` 인덱싱
- 집계 쿼리(약물 빈도)

### 7.4 알림 확장

- 재진/의료진 조회 알림
- 읽음 처리

### 7.5 OTC 복약편의 보조(가드레일 포함)

- 입력: 처방약 효능군 기반
- 출력: 브랜드 추천 금지, 카테고리 안내 + 약사 질문/주의 체크리스트

## 8) 실패 모드/복구 전략

- OCR Worker 장애: 큐잉 + 재시도 + 폴백(“나중에 다시 시도”)
- DB 장애: read-only 모드(공유 열람 최소 기능 유지) 고려
- 토큰 유출: TTL 짧게(10분), 재발급 시 즉시 폐기, 로그 기반 이상탐지(후속)

## 9) 성능/비용

- 이미지 업로드 크기 제한(예: 5–10MB)
- 서버 OCR은 비용 집중 지점:
  - 업로드 전 클라이언트 리사이즈(권장)
  - 비동기 처리(대기 화면)
  - 실패율/재시도율 모니터링
