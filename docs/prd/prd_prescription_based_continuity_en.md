# PRD: Prescription/Dispensing-Record–Based Care Continuity Summary (Draft v0.1)

## 0) Document Status

- This PRD is a **meeting-based draft**. Final legal interpretation/compliance must be confirmed by **professional counsel**.
- Meeting context: `docs/meeting_notes/2025-12-18_med_continuity_prescription_based.md`

## 1) Background / Problem

### 1.1 Problem

- Rural access constraints often break continuity between providers (A → B), resulting in:
  - repeated intake / repeated prescribing risk
  - duplicate testing and delays
  - worse patient experience

### 1.2 Hypothesis

- Even without EMR integration, if we can **standardize and summarize** patient-held documents (prescriptions/dispensing records)
  plus the patient’s course tracking, clinicians can review faster and continuity improves.

## 2) Goals / Non-Goals

### 2.1 Goals

- With a 2–3 minute waiting-room intake, generate a **medication & course summary**
  that the next clinician can understand via a **one-page view**.

### 2.2 Non-Goals (Initial)

- EMR/OCS integration
- Emergency scenarios
- Disease/diagnosis candidate inference (diagnostic support)
- Account/login-based clinician operations (excluded in MVP)
- Long-term storage of original images

## 3) Users / Scenarios

### 3.1 Users

- Patient (app)
- Clinician (read-only; no login in MVP)

### 3.2 Core Scenario (Waiting Room)

1. Patient: select the visiting hospital/clinic in the app
2. Patient: (optional) take photos of prescription/dispensing record + complete intake (2–3 min)
3. Patient: tap “Show to clinician” → generate one-time QR/code
4. Clinician: scan code → view one-page summary → expand raw text as needed

## 4) Product Scope (Requirements)

### 4.1 Patient App

- hospital search/selection
- document upload (optional): prescription/dispensing record
  - onboarding default (decided): **dispensing record first** (prescription is optional/additional)
- first result screen (decided): combine **Currently taking summary (A)** + **Medication reminders (C)**
- waiting-room intake (required): complaint/onset/course/adherence/adverse events/allergies/doctor-note (patient-written)
- share: one-time QR/code generation, expiry, re-issue
- data management: delete submitted intake/summary (patient control)

### 4.2 Clinician View (One-Page Summary)

- summary cards + expandable raw per section
- timeline range toggle: **30d / 90d**, default **90d (decided)**
- “Needs verification” markers for low-confidence OCR
- access log display (internal)

## 5) Data / AI Policy

### 5.1 Data Principles

- minimize collection and retention
- do **not** store original images (MVP)
  - processing (decided): **upload → immediate OCR → immediate deletion of originals (no storage)**

### 5.2 AI Usage Principles (MVP)

- **No disease/diagnosis candidate outputs**
- Allowed: OCR / formatting / summarization / fact-based conflict checks (as “verify”)
- Medication name normalization (MVP, decided): **Option A (OCR raw string; no ingredient/product mapping)**
- Vendors (decided):
  - OCR: **Google Cloud Vision**
  - LLM (optional): **Google Gemini** (summarization/classification/checklist only; no diagnosis inference)
- All outputs must include **source labeling** (patient-written / OCR extracted / system-derived)

## 6) Security / Privacy / Consent (Draft)

- treat as sensitive health data
- consent UX:
  - collection/use (items/purpose/retention)
  - third-party sharing (recipient = patient-selected provider/clinician; items/period)
  - withdrawal/deletion (patient)
- access control:
  - one-time token, TTL (**10 minutes, decided**); re-issue invalidates prior token
    - token rule (decided): **re-open allowed within TTL (10 min)**; no access after TTL
    - re-issue rule (decided): **patient-only re-issue**
  - encryption in transit/at rest
  - audit logs (view/create/delete)

## 7) Success Metrics (Draft)

- waiting-room intake completion rate
- clinician view/open rate (QR scan rate)
- time-to-summary and time-to-open
- clinician satisfaction (qualitative)
- reuse rate (next visit)

## 8) Rollout / Phases

### Phase 0 (MVP)

- server-side OCR (no storage) + waiting-room intake + one-page summary + QR sharing

### Phase 1

- medication normalization/ingredient mapping improvements
- intake personalization (branching/shortening)
- clinician login (operational hardening)
- (Auth) **Google login (OAuth/OIDC)** + **Phone login (SMS OTP)**
- (Add-on) OTC (over-the-counter) convenience assist
  - Input: derive OTC guidance **from the prescription drug efficacy class** (goal = adherence/convenience)
  - Output: do **not** recommend brand/product names; provide category-level guidance + a “questions & precautions for the pharmacist” checklist
  - Guardrails: avoid definitive substitution claims; show duplication/interaction only as “verify with pharmacist”

### Phase 2 (Optional)

- consider public/standard integrations (HIE / health data portability) or EMR partnerships

## 9) Risks / Mitigations

- OCR accuracy → confidence display + “verify” UX for patient/clinician
- no-login access → short TTL + re-issue invalidation + logs
- patient-written doctor note misunderstanding → clear “patient-written” labeling + clinician verification prompt

## 10) Remaining Decisions

- final intake question list/branching (keep under ~2 minutes)
- fixed field set for clinician one-page summary
