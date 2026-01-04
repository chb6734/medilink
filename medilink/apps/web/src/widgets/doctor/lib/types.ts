import type { PrescriptionRecord } from "@/entities/record/model/types";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";

export interface DoctorPatient {
  name: string;
  phone: string;
  age?: number;
  bloodType?: string;
  height?: number;
  weight?: number;
  allergies?: string;
}

export interface MedicationHistoryItem {
  date: string;
  taken: boolean;
  takenCount?: number;
  totalCount?: number;
  symptomLevel: number;
  notes: string | null;
}

export interface CurrentMedication {
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
}

export interface MedicationTrackingDay {
  date: Date;
  dateStr: string;
  dayOfWeek: string;
  taken: boolean;
  takenCount: number;
  totalCount: number;
  isFullyTaken: boolean;
  isPartiallyTaken: boolean;
  symptomLevel: number;
  notes: string | null;
}

export interface DoctorViewProps {
  records: PrescriptionRecord[];
  questionnaireData: QuestionnaireData | null;
  patient?: DoctorPatient;
  aiAnalysis?: string | null;
  medicationHistory?: MedicationHistoryItem[];
  currentMedications?: CurrentMedication[];
}

export const DEFAULT_PATIENT: DoctorPatient = {
  name: "홍길동",
  phone: "010-0000-0000",
  age: 34,
  bloodType: "A+",
  height: 172,
  weight: 68,
};
