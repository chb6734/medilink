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
}


