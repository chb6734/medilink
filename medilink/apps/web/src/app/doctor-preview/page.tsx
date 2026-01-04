"use client";

import { DoctorView } from "@/widgets/doctor/DoctorView";
import type { PrescriptionRecord } from "@/entities/record/model/types";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { getDoctorSummary, authMe, getPatientInfo } from "@/shared/api";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import { useEffect, useState } from "react";

export type MedicationHistoryItem = {
  date: string;
  taken: boolean;
  symptomLevel: number;
  notes: string | null;
};

export type CurrentMedication = {
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
};

export default function DoctorPreviewPage() {
  const [records, setRecords] = useState<PrescriptionRecord[]>([]);
  const [questionnaireData, setQuestionnaireData] =
    useState<QuestionnaireData | null>(null);
  const [patient, setPatient] = useState<{
    name: string;
    phone: string;
    age?: number;
    bloodType?: string;
    height?: number;
    weight?: number;
    allergies?: string;
  } | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [medicationHistory, setMedicationHistory] = useState<
    MedicationHistoryItem[]
  >([]);
  const [currentMedications, setCurrentMedications] = useState<
    CurrentMedication[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientId = getOrCreatePatientId();
        const [userData, summaryData, patientInfoData] = await Promise.all([
          authMe().catch(() => ({ authEnabled: false, user: null })),
          getDoctorSummary({ patientId }).catch(() => null),
          getPatientInfo().catch(() => null),
        ]);

        if (cancelled) return;

        // Set patient name from user data
        const userName =
          (userData.user as any)?.displayName ||
          (userData.user as any)?.phoneE164?.replace(/^\+82/, "0") ||
          "환자";
        const userPhone =
          (userData.user as any)?.phoneE164?.replace(/^\+82/, "0") || "";

        // 환자 정보 설정 (기본 정보 + 추가 정보)
        setPatient({
          name: userName,
          phone: userPhone,
          age: patientInfoData?.age ?? undefined,
          bloodType: patientInfoData?.bloodType ?? undefined,
          height: patientInfoData?.heightCm ?? undefined,
          weight: patientInfoData?.weightKg ?? undefined,
          allergies: patientInfoData?.allergies ?? undefined,
        });

        if (summaryData) {
          setRecords(summaryData.records);
          setCurrentMedications(summaryData.currentMedications || []);
          if (summaryData.intakeForms.length > 0) {
            const latestIntake = summaryData.intakeForms[0];
            setQuestionnaireData({
              hospitalName: summaryData.records[0]?.hospitalName || "",
              chiefComplaint: latestIntake.chiefComplaint || "",
              symptomStart: latestIntake.symptomStart || "",
              symptomProgress: latestIntake.symptomProgress || "",
              symptomDetail: "",
              medicationCompliance: "",
              sideEffects: latestIntake.sideEffects || "",
              allergies: latestIntake.allergies || "",
              patientNotes: latestIntake.patientNotes || "",
            });
          }
          setAiAnalysis(summaryData.aiAnalysis || null);
          setMedicationHistory(summaryData.medicationHistory || []);
        }
      } catch (e) {
        console.error("환자진료 요약 데이터 로드 실패:", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <DoctorView
      records={records}
      questionnaireData={questionnaireData}
      patient={patient || undefined}
      aiAnalysis={aiAnalysis}
      medicationHistory={medicationHistory}
      currentMedications={currentMedications}
    />
  );
}
