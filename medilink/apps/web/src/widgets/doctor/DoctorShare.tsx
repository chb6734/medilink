import { useMemo } from "react";
import { DoctorView } from "./DoctorView";
import type { PrescriptionRecord } from "@/entities/record/model/types";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { useShareData } from "./lib/useShareData";

export function DoctorShare({ token }: { token: string }) {
  const { loading, error, data } = useShareData(token);

  const records: PrescriptionRecord[] = useMemo(() => {
    if (!data?.records) return [];
    return data.records.map((r) => ({
      id: r.id,
      prescriptionDate: new Date(r.createdAt).toISOString().slice(0, 10),
      hospitalName: undefined,
      pharmacyName: undefined,
      chiefComplaint: r.chiefComplaint ?? undefined,
      diagnosis: r.doctorDiagnosis ?? undefined,
      ocrConfidence: undefined,
      medications: (r.meds ?? []).map((m, idx) => ({
        id: `${r.id}-${idx}`,
        name: m.nameRaw,
        dosage: "",
        frequency: "",
        startDate: new Date(r.createdAt).toISOString().slice(0, 10),
        prescribedBy: "",
        confidence: m.needsVerification ? 70 : undefined,
      })),
    }));
  }, [data]);

  // 실제 문진표 데이터 사용
  const questionnaireData: QuestionnaireData | null = data?.questionnaire ?? null;

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
        name: "환자", // 개인정보 보호를 위해 이름은 표시하지 않음
        phone: data.patient.emergencyContact ?? undefined,
        age: data.patient.age ?? undefined,
        bloodType: data.patient.bloodType ?? undefined,
        height: data.patient.height ?? undefined,
        weight: data.patient.weight ?? undefined,
      }
    : undefined;

  return (
    <DoctorView
      records={records}
      questionnaireData={questionnaireData}
      patient={patientInfo}
    />
  );
}


