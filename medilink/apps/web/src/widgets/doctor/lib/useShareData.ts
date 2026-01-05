"use client";

import { useEffect, useState } from "react";
import { fetchShare } from "@/shared/api";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { getErrorMessage } from "@/shared/lib/error";

interface ShareMedication {
  nameRaw: string;
  needsVerification: boolean;
  dose?: string;
  frequency?: string;
}

interface ShareLinkedIntakeForm {
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

interface ShareRecord {
  id: string;
  createdAt: string;
  chiefComplaint?: string;
  doctorDiagnosis?: string;
  meds?: ShareMedication[];
  facilityName?: string;
  linkedIntakeForm?: ShareLinkedIntakeForm | null;
}

export interface SharePatient {
  name: string | null;
  age: number | null;
  bloodType: string | null;
  height: number | null;
  weight: number | null;
  allergies: string | null;
  emergencyContact: string | null;
}

export interface ShareMedicationHistory {
  date: string;
  taken: boolean;
  takenCount: number;
  totalCount: number;
  symptomLevel: number;
  notes: string | null;
}

export interface ShareCurrentMedication {
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

export interface ShareData {
  records: ShareRecord[];
  questionnaire?: QuestionnaireData | null;
  patient?: SharePatient | null;
  medicationHistory?: ShareMedicationHistory[];
  currentMedications?: ShareCurrentMedication[];
  aiAnalysis?: string | null;
}

interface UseShareDataState {
  loading: boolean;
  error: string | null;
  data: ShareData | null;
}

/**
 * Hook to fetch share data by token
 */
export function useShareData(token: string): UseShareDataState {
  const [state, setState] = useState<UseShareDataState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setState({ loading: true, error: null, data: null });

      try {
        const data = await fetchShare(token);
        if (!cancelled) {
          setState({ loading: false, error: null, data: data as ShareData });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            loading: false,
            error: getErrorMessage(e),
            data: null,
          });
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return state;
}
