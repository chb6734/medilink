"use client";

import { useEffect, useState } from "react";
import { fetchShare } from "@/shared/api";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { getErrorMessage } from "@/shared/lib/error";

interface ShareMedication {
  nameRaw: string;
  needsVerification: boolean;
}

interface ShareRecord {
  id: string;
  createdAt: string;
  chiefComplaint?: string;
  doctorDiagnosis?: string;
  meds?: ShareMedication[];
}

export interface ShareData {
  records: ShareRecord[];
  questionnaire?: QuestionnaireData;
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
