"use client";

import { fetchForm, fetchJson } from "./client";

export type PreviewOcrResponse = {
  rawText: string;
  overallConfidence: number | null;
  meds: Array<{ nameRaw: string; confidence: number | null }>;
  // Gemini OCR(AS-IS) 확장 응답
  hospitalName?: string | null;
  patientCondition?: string | null;
  medications?: Array<{
    medicationName: string;
    dose: string | null;
    frequency: string | null;
    duration: string | null;
    prescriptionDate: string | null;
    dispensingDate: string | null;
    confidence: number;
    ingredients: string | null;
    indication: string | null;
    dosesPerDay: number | null;
    totalDoses: number | null;
  }> | null;
  // Vision API bounding box 정보
  textAnnotations?: Array<{
    text: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
};

export async function previewOcr(file: File): Promise<PreviewOcrResponse> {
  const form = new FormData();
  form.append("file", file);
  return await fetchForm<PreviewOcrResponse>("/api/records/preview-ocr", form);
}

export async function createRecord(params: {
  patientId: string;
  recordType: "dispensing_record" | "prescription";
  file: File;
  chiefComplaint?: string;
  facilityName?: string;
  facilityType?: "clinic" | "hospital" | "pharmacy" | "unknown";
  doctorDiagnosis?: string;
  noteDoctorSaid?: string;
  prescribedAt?: string;
  dispensedAt?: string;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    confidence?: number;
  }>;
  daysSupply?: number;
}) {
  const form = new FormData();
  form.append("file", params.file);

  const qs = new URLSearchParams({
    patientId: params.patientId,
    recordType: params.recordType,
  });
  if (params.chiefComplaint) qs.set("chiefComplaint", params.chiefComplaint);
  if (params.facilityName) qs.set("facilityName", params.facilityName);
  if (params.facilityType) qs.set("facilityType", params.facilityType);
  if (params.doctorDiagnosis) qs.set("doctorDiagnosis", params.doctorDiagnosis);
  if (params.noteDoctorSaid) qs.set("noteDoctorSaid", params.noteDoctorSaid);
  if (params.prescribedAt) qs.set("prescribedAt", params.prescribedAt);
  if (params.dispensedAt) qs.set("dispensedAt", params.dispensedAt);
  if (params.medications) qs.set("medications", JSON.stringify(params.medications));
  if (params.daysSupply !== undefined) qs.set("daysSupply", String(params.daysSupply));

  return await fetchForm<{ id: string }>(`/api/records?${qs.toString()}`, form);
}

export async function getRecordCount(params: {
  patientId: string;
  days?: number;
}) {
  const qs = new URLSearchParams({ patientId: params.patientId });
  if (params.days != null) qs.set("days", String(params.days));

  return await fetchJson<{ count: number; days: number; since: string }>(
    `/api/records/count?${qs.toString()}`,
    { method: "GET" }
  );
}

export async function createShareToken(params: {
  patientId: string;
  facilityId?: string;
}) {
  return await fetchJson<{ token: string; expiresAt: string }>(
    "/api/share-tokens",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}

export async function fetchShare(token: string) {
  return await fetchJson(`/share/${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

export async function authMe() {
  return await fetchJson<{ authEnabled: boolean; user: unknown }>(
    "/api/auth/me",
    { method: "GET" }
  );
}

export async function authLogout() {
  return await fetchJson<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export async function authGoogle(params: { idToken: string }) {
  return await fetchJson<{ ok: true }>("/api/auth/google", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function authPhoneStart(params: { phoneE164: string }) {
  return await fetchJson<{ challengeId: string; expiresAt: number }>(
    "/api/auth/phone/start",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}

export async function authPhoneVerify(params: {
  challengeId: string;
  code: string;
}) {
  return await fetchJson<{ ok: true }>("/api/auth/phone/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

// ============= 비밀번호 기반 인증 API =============

// 비밀번호 로그인
export async function authLogin(params: { phoneE164: string; password: string }) {
  return await fetchJson<{ ok: true; userId: string }>("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

// 회원가입
export async function authRegister(params: {
  phoneE164: string;
  password: string;
  name?: string;
}) {
  return await fetchJson<{ ok: true; userId: string }>("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

// 아이디(전화번호) 찾기
export async function authFindPhone(params: { name: string; birthDate: string }) {
  return await fetchJson<{ maskedPhone: string }>("/api/auth/find-phone", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

// 비밀번호 재설정 1단계: 전화번호 인증 시작
export async function authResetPasswordStart(params: { phoneE164: string }) {
  return await fetchJson<{ challengeId: string; expiresAt: number }>(
    "/api/auth/reset-password/start",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}

// 비밀번호 재설정 2단계: 인증번호 확인 및 새 비밀번호 설정
export async function authResetPasswordComplete(params: {
  challengeId: string;
  code: string;
  newPassword: string;
}) {
  return await fetchJson<{ ok: true }>("/api/auth/reset-password/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function getDoctorSummary(params: { patientId: string }) {
  const qs = new URLSearchParams({ patientId: params.patientId });
  return await fetchJson<{
    records: Array<{
      id: string;
      prescriptionDate: string;
      hospitalName?: string;
      pharmacyName?: string;
      chiefComplaint?: string;
      diagnosis?: string;
      medications: Array<{
        id: string;
        name: string;
        dosage: string;
        frequency: string;
        startDate: string;
        endDate?: string;
        prescribedBy: string;
        confidence?: number;
      }>;
      ocrConfidence?: number;
    }>;
    intakeForms: Array<{
      id: string;
      chiefComplaint: string;
      symptomStart: string;
      symptomProgress: string;
      sideEffects: string;
      allergies: string;
      patientNotes?: string;
      createdAt: string;
    }>;
    currentMedications: Array<{
      id: string;
      name: string;
      dosage: string;
      frequency: string;
      startDate: string;
      endDate: string | null;
      prescribedBy: string;
      confidence?: number;
      recordId: string;
      recordDate: string;
    }>;
    medicationHistory: Array<{
      date: string;
      taken: boolean;
      symptomLevel: number;
      notes: string | null;
    }>;
    aiAnalysis?: string | null;
  }>(`/api/records/doctor-summary?${qs.toString()}`, {
    method: "GET",
  });
}

export async function getRecords(params: { patientId: string }) {
  const qs = new URLSearchParams({ patientId: params.patientId });
  return await fetchJson<{
    records: Array<{
      id: string;
      prescriptionDate: string;
      hospitalName?: string;
      pharmacyName?: string;
      chiefComplaint?: string;
      diagnosis?: string;
      medications: Array<{
        id: string;
        name: string;
        dosage: string;
        frequency: string;
        startDate: string;
        endDate?: string;
        prescribedBy: string;
        confidence?: number;
      }>;
      daysSupply?: number;
      ocrConfidence?: number;
    }>;
  }>(`/api/records?${qs.toString()}`, {
    method: "GET",
  });
}

export async function updateRecord(params: {
  recordId: string;
  dailyLog?: Record<string, boolean>;
  alarmTimes?: string[];
  medications?: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
  }>;
}) {
  return await fetchJson<{ id: string; updated: boolean }>(
    `/api/records/${params.recordId}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dailyLog: params.dailyLog,
        alarmTimes: params.alarmTimes,
        medications: params.medications,
      }),
    }
  );
}

// ============= 환자 정보 API =============

export type PatientInfo = {
  id: string;
  name: string | null;
  birthDate: string | null;
  age: number | null;
  bloodType: string | null;
  heightCm: number | null;
  weightKg: number | null;
  allergies: string | null;
  emergencyContact: string | null;
  createdAt: string;
};

export async function getPatientInfo(): Promise<PatientInfo> {
  return await fetchJson<PatientInfo>("/api/patients/me", {
    method: "GET",
  });
}

export async function updatePatientInfo(params: {
  name?: string;
  birthDate?: string;
  bloodType?: string;
  heightCm?: number;
  weightKg?: number;
  allergies?: string;
  emergencyContact?: string;
}): Promise<PatientInfo> {
  return await fetchJson<PatientInfo>("/api/patients/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

// ============= 병원/의료기관 API =============

export type Facility = {
  id: string;
  name: string;
  type: "clinic" | "hospital" | "pharmacy" | "unknown";
  typeLabel: string;
  specialty: string | null;
  address: string | null;
  phone: string | null;
  createdAt: string;
};

export async function searchFacilities(params: {
  keyword?: string;
  specialty?: string;
  type?: "clinic" | "hospital" | "pharmacy" | "unknown";
}): Promise<{ facilities: Facility[]; count: number }> {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.specialty) qs.set("specialty", params.specialty);
  if (params.type) qs.set("type", params.type);

  return await fetchJson<{ facilities: Facility[]; count: number }>(
    `/api/facilities/search?${qs.toString()}`,
    { method: "GET" }
  );
}

export async function recommendSpecialty(params: {
  chiefComplaint: string; // 주요 증상
  symptomDetail?: string; // 증상 상세 (선택)
}): Promise<{
  recommendedSpecialties: string[];
  primarySpecialty: string;
  reasoning: string;
}> {
  return await fetchJson<{
    recommendedSpecialties: string[];
    primarySpecialty: string;
    reasoning: string;
  }>("/api/facilities/recommend-specialty", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

// ============= 복약 순응도 API =============

export type AdherenceGrade = {
  grade: "excellent" | "good" | "fair" | "poor";
  label: string;
  description: string;
  color: string;
};

export type AdherenceResponse = {
  overall: number | null;
  last7Days: number | null;
  last14Days: number | null;
  last30Days: number | null;
  grade: AdherenceGrade | null;
  dailyAdherence: Record<string, number>;
  message?: string;
};

export async function getAdherence(recordId: string): Promise<AdherenceResponse> {
  return await fetchJson<AdherenceResponse>(`/api/records/${recordId}/adherence`, {
    method: "GET",
  });
}

// ============= 복약 체크 API =============

export type MedicationCheck = {
  id: string;
  scheduledAt: string;
  isTaken: boolean;
  takenAt: string | null;
};

export async function getMedicationChecks(recordId: string): Promise<{ checks: MedicationCheck[] }> {
  return await fetchJson<{ checks: MedicationCheck[] }>(`/api/records/${recordId}/medication-checks`, {
    method: "GET",
  });
}

export async function updateMedicationCheck(
  checkId: string,
  isTaken: boolean
): Promise<{ id: string; isTaken: boolean; takenAt: string | null }> {
  return await fetchJson<{ id: string; isTaken: boolean; takenAt: string | null }>(
    `/api/medication-checks/${checkId}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isTaken }),
    }
  );
}

// ============= IntakeForm (문진표) API =============

export type IntakeForm = {
  id: string;
  patientId: string;
  facilityId: string | null;
  facility: Facility | null;
  visitType: "new_symptom" | "followup";
  relatedRecordId: string | null;
  chiefComplaint: string;
  onsetText: string | null;
  course: "improving" | "worsening" | "no_change" | "unknown";
  courseNote: string | null;
  adherence: "yes" | "partial" | "no" | "unknown";
  adherenceReason: string | null;
  adverseEvents: string | null;
  allergies: string | null;
  createdAt: string;
};

export async function createIntakeForm(params: {
  patientId: string;
  facilityId?: string;
  visitType: "new_symptom" | "followup";
  relatedRecordId?: string;
  chiefComplaint: string;
  onsetText?: string;
  course: "improving" | "worsening" | "no_change" | "unknown";
  courseNote?: string;
  adherence: "yes" | "partial" | "no" | "unknown";
  adherenceReason?: string;
  adverseEvents?: string;
  allergies?: string;
}): Promise<IntakeForm> {
  return await fetchJson<IntakeForm>("/api/intake-forms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function getIntakeForms(patientId: string): Promise<IntakeForm[]> {
  return await fetchJson<IntakeForm[]>(`/api/intake-forms?patientId=${patientId}`, {
    method: "GET",
  });
}

export async function findOrCreateFacility(params: {
  name: string;
  type?: "clinic" | "hospital" | "pharmacy" | "unknown";
}): Promise<Facility> {
  return await fetchJson<Facility>("/api/facilities/find-or-create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

// ============= 처방 기록 삭제 API =============

export async function deleteRecord(recordId: string): Promise<{ id: string; deleted: boolean }> {
  return await fetchJson<{ id: string; deleted: boolean }>(`/api/records/${recordId}`, {
    method: "DELETE",
  });
}

// ============= 처방 기록 수정 API =============

export async function updatePrescriptionRecord(params: {
  recordId: string;
  facilityName?: string;
  chiefComplaint?: string;
  doctorDiagnosis?: string;
  noteDoctorSaid?: string;
  prescribedAt?: string;
  dispensedAt?: string;
  daysSupply?: number;
}): Promise<{ id: string; updated: boolean; checksCreated?: number }> {
  const { recordId, ...data } = params;
  return await fetchJson<{ id: string; updated: boolean; checksCreated?: number }>(
    `/api/records/${recordId}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }
  );
}

// ============= 개별 처방 기록 조회 API =============

export async function getRecord(recordId: string): Promise<{
  id: string;
  prescriptionDate: string;
  hospitalName?: string;
  pharmacyName?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  dispensedAt?: string;
  daysSupply?: number;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
  }>;
}> {
  return await fetchJson(`/api/records/${recordId}`, {
    method: "GET",
  });
}
