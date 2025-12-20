import { useEffect, useMemo, useState } from "react";
import { DoctorView } from "./DoctorView";
import type { PrescriptionRecord } from "@/entities/record/model/types";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { fetchShare } from "@/shared/api";

export function DoctorShare({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchShare(token)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message ?? e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const records: PrescriptionRecord[] = useMemo(() => {
    if (!data?.records) return [];
    return data.records.map((r: any) => ({
      id: r.id,
      prescriptionDate: new Date(r.createdAt).toISOString().slice(0, 10),
      hospitalName: undefined,
      pharmacyName: undefined,
      chiefComplaint: r.chiefComplaint ?? undefined,
      diagnosis: r.doctorDiagnosis ?? undefined,
      ocrConfidence: undefined,
      medications: (r.meds ?? []).map((m: any, idx: number) => ({
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

  const questionnaireData: QuestionnaireData | null = null;

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

  return <DoctorView records={records} questionnaireData={questionnaireData} />;
}


