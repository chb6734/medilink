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

  return await fetchForm(`/api/records?${qs.toString()}`, form);
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
  symptoms: string;
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
