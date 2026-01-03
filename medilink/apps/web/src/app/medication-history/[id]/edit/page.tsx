"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { getRecords, updatePrescriptionRecord } from "@/shared/api";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";

export default function EditPrescriptionPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [hospitalName, setHospitalName] = useState("");
  const [dispensedAt, setDispensedAt] = useState("");
  const [daysSupply, setDaysSupply] = useState<number | "">("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  const loadRecord = async () => {
    try {
      const patientId = getOrCreatePatientId();
      const data = await getRecords({ patientId });
      const record = data.records.find((r) => r.id === recordId);

      if (!record) {
        setError("처방 기록을 찾을 수 없습니다.");
        return;
      }

      setHospitalName(record.hospitalName || record.pharmacyName || "");
      setDispensedAt(record.prescriptionDate || "");
      setDaysSupply(record.daysSupply || "");
      setChiefComplaint(record.chiefComplaint || "");
      setDiagnosis(record.diagnosis || "");
    } catch (e) {
      console.error("처방 기록 로드 실패:", e);
      setError("처방 기록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePrescriptionRecord({
        recordId,
        facilityName: hospitalName || undefined,
        dispensedAt: dispensedAt || undefined,
        daysSupply: typeof daysSupply === "number" ? daysSupply : undefined,
        chiefComplaint: chiefComplaint || undefined,
        doctorDiagnosis: diagnosis || undefined,
      });

      alert("처방 정보가 수정되었습니다.");
      router.back();
    } catch (e) {
      console.error("처방 수정 실패:", e);
      alert("처방 수정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              border: "none",
              background: "#3B82F6",
              color: "white",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <div
        style={{
          background: "var(--gradient-card)",
          padding: "48px 24px 32px",
          borderBottomLeftRadius: "32px",
          borderBottomRightRadius: "32px",
          color: "white",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            padding: "8px",
            borderRadius: "12px",
            color: "white",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "800",
            marginBottom: "8px",
            color: "white",
          }}
        >
          처방 정보 수정
        </h1>
        <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
          처방 정보를 수정하고 저장하세요
        </p>
      </div>

      {/* Form */}
      <div style={{ padding: "24px" }}>
        {/* 병원/약국명 */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: "var(--color-text-primary)",
              marginBottom: "8px",
            }}
          >
            병원/약국명
          </label>
          <input
            type="text"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            placeholder="병원 또는 약국 이름"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "2px solid #D1D5DB",
              fontSize: "1rem",
              background: "white",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
          />
        </div>

        {/* 조제일 & 복용일수 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9375rem",
                fontWeight: "700",
                color: "var(--color-text-primary)",
                marginBottom: "8px",
              }}
            >
              조제일
            </label>
            <input
              type="date"
              value={dispensedAt}
              onChange={(e) => setDispensedAt(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "2px solid #D1D5DB",
                fontSize: "1rem",
                background: "white",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.9375rem",
                fontWeight: "700",
                color: "var(--color-text-primary)",
                marginBottom: "8px",
              }}
            >
              복용일수
            </label>
            <input
              type="number"
              value={daysSupply}
              onChange={(e) => setDaysSupply(e.target.value ? parseInt(e.target.value, 10) : "")}
              placeholder="예: 7"
              min={1}
              max={365}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "2px solid #D1D5DB",
                fontSize: "1rem",
                background: "white",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "6px" }}>
              복용일수를 입력하면 복약 체크가 자동 생성됩니다
            </p>
          </div>
        </div>

        {/* 증상/호소 */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: "var(--color-text-primary)",
              marginBottom: "8px",
            }}
          >
            주요 증상
          </label>
          <textarea
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="주요 증상을 입력하세요"
            rows={3}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "2px solid #D1D5DB",
              fontSize: "1rem",
              background: "white",
              outline: "none",
              resize: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
          />
        </div>

        {/* 진단명 */}
        <div style={{ marginBottom: "32px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.9375rem",
              fontWeight: "700",
              color: "var(--color-text-primary)",
              marginBottom: "8px",
            }}
          >
            진단명
          </label>
          <input
            type="text"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="진단명을 입력하세요"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "2px solid #D1D5DB",
              fontSize: "1rem",
              background: "white",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "16px",
            border: "none",
            background: saving ? "#9CA3AF" : "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)",
            color: "white",
            fontSize: "1rem",
            fontWeight: "700",
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(40, 91, 170, 0.3)",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}
