"use client";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  confidence?: number;
}

export interface LinkedIntakeForm {
  id: string;
  chiefComplaint: string;
  symptomStart: string;
  symptomProgress: string;
  symptomDetail?: string;
  medicationCompliance: string;
  sideEffects: string;
  allergies: string;
  hospitalName: string;
  patientNotes?: string;
  createdAt: string;
}

export interface PrescriptionRecord {
  id: string;
  medications: Medication[];
  hospitalName?: string;
  pharmacyName?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  prescriptionDate: string;
  imageUrl?: string;
  ocrConfidence?: number;
  daysSupply?: number;
  dailyLog?: Record<string, boolean>;
  alarmTimes?: string[];
  linkedIntakeForm?: LinkedIntakeForm | null;
}


