"use client";

import { getLocalStorage, createStringStorage } from "@/shared/lib/storage";

/**
 * Storage key for patient ID
 * Named constant improves Readability by giving semantic meaning
 */
const PATIENT_ID_KEY = "mb.patientId";

/**
 * Patient ID storage accessor
 * Uses the storage abstraction for SSR safety
 */
const patientIdStorage = createStringStorage(
  getLocalStorage(),
  PATIENT_ID_KEY
);

/**
 * Get or create a unique patient identifier
 *
 * This function is SSR-safe - it will return a new UUID on the server
 * but won't persist it. The ID is only persisted when running in the browser.
 *
 * @returns The patient ID (existing or newly created)
 */
export function getOrCreatePatientId(): string {
  const existing = patientIdStorage.get();
  if (existing) return existing;

  const id = crypto.randomUUID();
  patientIdStorage.set(id);
  return id;
}
