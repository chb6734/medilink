# Meeting Notes: Prescription/Dispensing-Record–Based Care Continuity (MVP) (2025-12-18)

## Attendees
- **CEO (Elon-style)**: Vision/product direction, speed-first with calculated risk
- **PM (Athena)**: Compliance/execution/scope alignment
- **User (You)**: Product decisions, MVP constraints/operational choices

## Problem Statement
- **Rural healthcare access**: Fewer hospitals/clinics and high travel cost break continuity—context from Hospital A is not carried to Hospital B.
- **Goal**: Enable Hospital B to continue care using prior context to **reduce duplicate tests/visits and decrease delays**.

## Key Constraints / Assumptions
- **No direct EMR integration in MVP** (complex onboarding, regulatory/contracting overhead)
- **No emergency scenarios in MVP** (e.g., unconscious patient)
- Patient is assumed to **use the app directly** (caregiver/guardian flows are lower priority for now)

## Data Approach (Agreed)
- Use documents the patient possesses:
  - **Paper prescription photo**
  - **Pharmacy dispensing record photo** (med guide/dispensing record/receipt, etc.)
- Patient can add a short note: **“What the doctor said”**
- Based on the above, the system provides:
  - **Medication timeline** (when / what / how long)
  - **Patient course tracking** (improvement/worsening timing after medication)
  - **One-page clinician summary** for the next provider

## AI Scope Discussion & Decision
- User proposal: infer **diagnosis/condition** from medications (Option C)
- PM risk callout:
  - Even if shown **only to clinicians** (not the patient), “disease likelihood inference” can be considered **clinical decision support**, potentially triggering **SaMD/AI medical device (MFDS) regulatory track**
- Final decision (User): **Regulatory track = NO**
  - MVP must **not output diagnosis/disease candidates**
  - Instead: **collect structured patient answers → summarize/structure → deliver to clinician**

## Questionnaire/Intake Strategy (Agreed)
- Ask the questions to the **patient**, show the answers to the **clinician** (confirmed)
- Patient-facing outputs are minimized; design is clinician-reference first
- Timing: **during waiting time at the hospital/clinic**
- Display: **summary + expandable raw text**

## Clinician Access (Agreed)
- Patient flow: start intake **after selecting the hospital**
- Clinician access (MVP): **no login**
- MVP-easy choice:
  - Patient presents a **QR/code** on-site; clinician scans to view (no automatic sending / no hospital system integration in MVP)

## Original Image Storage Policy (Agreed)
- **Option A**: do **not** store original images on the server
- Implementation (final):
  - **Upload to server → run OCR immediately → delete original images immediately (no storage)**; store only extracted text

## Clinician View Requirement (Agreed)
- Clinician-facing **one-page summary** is **mandatory**
- Field-level details will be finalized in PRD/spec

## Open Items / Next Decisions
- (Resolved) OCR processing: **server-side immediate processing (no storage)**
- (Resolved) Medication name normalization (MVP): **store/display OCR raw string (Option A)**
- Finalize intake questions (2–3 min) and required vs optional items
- Access-control policy (partially resolved)
  - (Resolved) TTL default: **10 minutes**
  - (Resolved) “Single token” rule: **re-open allowed within TTL**, no access after TTL
  - (Resolved) Re-issue rule: **patient-only re-issue**, re-issue invalidates previous token immediately
  - (Remaining) log semantics/details and wording
- Legal/UX guardrails for “patient-written doctor note” (source labeling, anti-misinterpretation copy)


