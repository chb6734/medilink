const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

export type PreviewOcrResponse = {
  rawText: string;
  overallConfidence: number | null;
  meds: Array<{ nameRaw: string; confidence: number | null }>;
};

export async function previewOcr(file: File): Promise<PreviewOcrResponse> {
  const form = new FormData();
  form.append("file", file);

  const resp = await fetch(`${API_BASE_URL}/api/records/preview-ocr`, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`preview-ocr failed: ${resp.status} ${text}`);
  }
  return await resp.json();
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

  const resp = await fetch(`${API_BASE_URL}/api/records?${qs.toString()}`, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`create record failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

export async function createShareToken(params: { patientId: string; facilityId?: string }) {
  const resp = await fetch(`${API_BASE_URL}/api/share-tokens`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`create share token failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

export async function fetchShare(token: string) {
  const resp = await fetch(`${API_BASE_URL}/share/${encodeURIComponent(token)}`, {
    method: "GET",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`fetch share failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}


