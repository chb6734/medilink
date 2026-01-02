import crypto from 'node:crypto';

export type MemoryRecord = {
  id: string;
  patientId: string;
  recordType: 'dispensing_record' | 'prescription';
  createdAt: Date;
  chiefComplaint?: string;
  doctorDiagnosis?: string;
  noteDoctorSaid?: string;
  meds: Array<{ nameRaw: string; needsVerification: boolean }>;
  rawText: string | null;
  geminiSummary: string | null;
};

export type MemoryShare = {
  id: string;
  patientId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

const memory = {
  recordsByPatient: new Map<string, MemoryRecord[]>(),
  sharesByTokenHash: new Map<string, MemoryShare>(),
  sharesByPatient: new Map<string, MemoryShare[]>(),
};

export function memAddRecord(r: MemoryRecord) {
  const arr = memory.recordsByPatient.get(r.patientId) ?? [];
  arr.unshift(r);
  memory.recordsByPatient.set(r.patientId, arr.slice(0, 50));
}

export function memRevokeShares(patientId: string) {
  const arr = memory.sharesByPatient.get(patientId) ?? [];
  const now = new Date();
  for (const s of arr) {
    if (!s.revokedAt && s.expiresAt > now) s.revokedAt = now;
  }
  memory.sharesByPatient.set(patientId, arr);
}

export function memCreateShare(
  patientId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  const s: MemoryShare = {
    id: crypto.randomUUID(),
    patientId,
    tokenHash,
    expiresAt,
    revokedAt: null,
    createdAt: new Date(),
  };
  memory.sharesByTokenHash.set(tokenHash, s);
  const arr = memory.sharesByPatient.get(patientId) ?? [];
  arr.unshift(s);
  memory.sharesByPatient.set(patientId, arr.slice(0, 20));
  return s;
}

export function memGetShareByHash(tokenHash: string) {
  return memory.sharesByTokenHash.get(tokenHash) ?? null;
}

export function memGetRecords(patientId: string) {
  return memory.recordsByPatient.get(patientId) ?? [];
}
