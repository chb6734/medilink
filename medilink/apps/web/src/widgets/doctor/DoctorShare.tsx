import { useMemo } from "react";
import { DoctorView } from "./DoctorView";
import type { PrescriptionRecord } from "@/entities/record/model/types";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { useShareData } from "./lib/useShareData";
import type { MedicationHistoryItem, CurrentMedication } from "./lib/types";

export function DoctorShare({ token }: { token: string }) {
  const { loading, error, data } = useShareData(token);

  const records: PrescriptionRecord[] = useMemo(() => {
    if (!data?.records) return [];
    return data.records.map((r) => ({
      id: r.id,
      prescriptionDate: new Date(r.createdAt).toISOString().slice(0, 10),
      hospitalName: r.facilityName ?? undefined,
      pharmacyName: undefined,
      chiefComplaint: r.chiefComplaint ?? undefined,
      diagnosis: r.doctorDiagnosis ?? undefined,
      ocrConfidence: undefined,
      medications: (r.meds ?? []).map((m, idx) => ({
        id: `${r.id}-${idx}`,
        name: m.nameRaw,
        dosage: m.dose ?? "",
        frequency: m.frequency ?? "",
        startDate: new Date(r.createdAt).toISOString().slice(0, 10),
        prescribedBy: r.facilityName ?? "",
        confidence: m.needsVerification ? 70 : undefined,
      })),
    }));
  }, [data]);

  // 실제 문진표 데이터 사용
  const questionnaireData: QuestionnaireData | null = data?.questionnaire ?? null;

  // 복약 기록 변환
  const medicationHistory: MedicationHistoryItem[] = useMemo(() => {
    if (!data?.medicationHistory) return [];
    return data.medicationHistory.map((h) => ({
      date: h.date,
      taken: h.taken,
      takenCount: h.takenCount,
      totalCount: h.totalCount,
      symptomLevel: h.symptomLevel,
      notes: h.notes,
    }));
  }, [data]);

  // 현재 복용중인 약 변환
  const currentMedications: CurrentMedication[] = useMemo(() => {
    if (!data?.currentMedications) return [];
    return data.currentMedications.map((m) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      startDate: m.startDate,
      endDate: m.endDate,
      prescribedBy: m.prescribedBy,
      confidence: m.confidence,
      recordId: m.recordId,
      recordDate: m.recordDate,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: 24 }}>
        <div className="card" style={{ padding: 20, maxWidth: 420 }}>
          <h3 style={{ marginBottom: 8 }}>불러오는 중</h3>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            요약 화면을 불러오고 있어요.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: 24 }}>
        <div className="card" style={{ padding: 20, maxWidth: 520, border: "2px solid #FDE68A" }}>
          <h3 style={{ marginBottom: 8 }}>열람 불가</h3>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
            코드가 만료되었거나(10분), 재발급되어 더 이상 유효하지 않을 수 있어요.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--color-text-tertiary)" }}>
            {error}
          </pre>
        </div>
      </div>
    );
  }

  // 환자 정보 (API에서 받은 데이터 사용)
  const patientInfo = data?.patient
    ? {
        name: data.patient.name ?? "환자",
        phone: data.patient.emergencyContact ?? undefined,
        age: data.patient.age ?? undefined,
        bloodType: data.patient.bloodType ?? undefined,
        height: data.patient.height ?? undefined,
        weight: data.patient.weight ?? undefined,
        allergies: data.patient.allergies ?? undefined,
      }
    : undefined;

  return (
    <DoctorView
      records={records}
      questionnaireData={questionnaireData}
      patient={patientInfo}
      aiAnalysis={data?.aiAnalysis}
      medicationHistory={medicationHistory}
      currentMedications={currentMedications}
    />
  );
}


