# MVP Spec: Prescription/Dispensing-Record–Based Care Continuity Summary (Patient-Driven) v0.1

## 1) MVP Goal
- When a patient moves across providers (clinic ↔ hospital ↔ tertiary hospital), quickly structure prior medication history and course
  so the next clinician can **review it in a short time**.

## 2) Non-Goals (Explicitly Out of Scope)
- Direct EMR/OCS integration
- Emergency scenarios
- **Disease/diagnosis candidate inference** (forbidden even for clinicians)
- Long-term medical document vault (long-term storage of original images)
- Account-based clinician operation (login is a later phase)

## 3) Users / Roles
- **Patient (required)**: app user, data owner, initiates sharing
- **Clinician (read-only, MVP)**: views a “one-page summary” via a one-time code without login

## 4) Inputs (Patient)
- **Hospital selection**: search/select the visiting provider
- **Document upload (optional)**:
  - Paper prescription photo
  - Pharmacy dispensing record photo (med guide/dispensing record/receipt, etc.)
  - Onboarding default (decided): **prompt dispensing record first** (prescription is optional/additional)
- **Waiting-room intake (2–3 minutes)**:
  - chief complaint (select + free text)
  - onset (when it started)
  - course (improving/worsening/no change + timing)
  - adherence (yes/partial/no + reason)
  - adverse events / allergies (yes/no + details)
  - “what the doctor said” (patient note, 1–2 sentences)

## 5) Processing (System)
### 5.1 OCR & Structuring
- Extract (as available):
  - medication name (attempt ingredient/product when possible)
  - dose/frequency/duration
  - prescription date (if present)
  - dispensing date (if present)
- Medication name normalization (MVP, decided):
  - **Option A: store/display OCR raw string** (no ingredient/product mapping in MVP)
- If extraction fails/low confidence: label as **“Needs verification”**

### 5.2 Fact-Based Checks (No Disease Inference)
- Potential duplication markers (same/similar items) shown only as “possible / verify”
- Date overlaps / missing periods (conflicts with adherence answers) flagged as “verify”
- Possible conflicts with reported allergies/adverse events flagged as “verify”

## 6) Output (Clinician One-Page Summary, Required)
### 6.1 Summary (Default view)
- selected hospital + created time
- chief complaint summary + onset
- medication timeline (30/90 day toggle, **default 90 days (decided)**)
- course summary (from patient inputs) + key change points
- adherence summary
- adverse events / allergies summary
- “Needs verification” list (low-confidence OCR, possible conflicts)

### 6.2 Expand Raw (Per Section)
- patient free-text (source: patient-written)
- “what the doctor said” raw text (source: patient-written)
- OCR raw extraction + confidence (source: document OCR)
- Original images: **no server storage in MVP**
  - Implementation (decided): **upload → OCR immediately → delete originals immediately (no storage)**

## 6.3 Patient “First Result Screen” (B2C hook, MVP recommended)
- Immediately after dispensing-record OCR, the first patient-facing screen should provide both (decided):
  - **A**: a prominent “Currently taking” summary (OCR raw medication name, plus duration/frequency and rough remaining days when feasible)
  - **C**: a direct “Set medication reminders” CTA (one-tap setup with sensible defaults)
- Rationale:
  - Delivers immediate value even if the patient never switches providers (know current meds + reminders).
  - Naturally bridges to the clinician flow (“Show to clinician” one-page summary) later.

## 7) Share / Access Flow (No-Login MVP)
- Patient taps “Show to clinician” → generates a one-time QR/code
- Clinician scans code to view
- Minimum security guardrails:
  - Token rule (decided): **re-open allowed within TTL (10 min)**; no access after TTL
  - TTL default: **10 minutes (decided)** (configurable)
  - Re-issue rule (decided): **patient-only** re-issue; re-issue invalidates prior code/token immediately
  - Access logs (who/when/which code)

## 8) Privacy & Security (Minimum Requirements)
- Treat all collected data as sensitive health data
- Data minimization: do not store original images; store only necessary structured fields/text
- Encrypt in transit and at rest; token-based access control; audit logs
- Consents:
  - collection/use consent (items/purpose/retention)
  - third-party sharing consent (recipient = patient-selected provider/clinician; items/period)
  - withdrawal/deletion (patient)

## 9) MVP Success Metrics (Draft)
- intake completion rate in waiting room
- clinician view/open rate (QR scan rate)
- clinician feedback (“useful”) via qualitative signal
- reuse rate on a subsequent visit

## 10) Open Items
- Prescription/dispensing record format variance handling (OCR robustness)
- Clinician view field finalization (fixed layout)
- Optional additional safeguards (PIN, clinic IP restrictions, etc.)


