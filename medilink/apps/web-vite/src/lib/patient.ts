const KEY = "medilink.patientId";

export function getOrCreatePatientId() {
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  return id;
}


