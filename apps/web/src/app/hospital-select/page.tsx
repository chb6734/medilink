"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HospitalSearchWithAI } from "@/features/hospital-search/HospitalSearchWithAI";
import {
  createIntakeForm,
  createShareToken,
  getRecords,
  findOrCreateFacility,
} from "@/shared/api";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import type { Facility } from "@/shared/api/medilink";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";

// 문진표 데이터 → IntakeForm course 타입 매핑
function mapCourseType(
  symptomProgress?: string
): "improving" | "worsening" | "no_change" | "unknown" {
  if (!symptomProgress) return "unknown";
  if (symptomProgress.includes("좋아지고")) return "improving";
  if (symptomProgress.includes("나빠지고")) return "worsening";
  if (symptomProgress.includes("비슷")) return "no_change";
  return "unknown";
}

// 문진표 데이터 → IntakeForm adherence 타입 매핑
function mapAdherenceType(
  medicationCompliance?: string
): "yes" | "partial" | "no" | "unknown" {
  if (!medicationCompliance) return "unknown";
  if (medicationCompliance.includes("빠짐없이")) return "yes";
  if (medicationCompliance.includes("가끔")) return "partial";
  if (
    medicationCompliance.includes("중단") ||
    medicationCompliance.includes("자주")
  )
    return "no";
  if (medicationCompliance.includes("처방받은 적 없음")) return "unknown";
  return "unknown";
}

function HospitalSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const visitType = (searchParams.get("visitType") || "new") as
    | "new"
    | "followup";
  const symptoms = searchParams.get("symptoms") || "";
  const recordId = searchParams.get("recordId") || "";

  const [loading, setLoading] = useState(false);
  const [defaultHospitalName, setDefaultHospitalName] = useState<string>("");

  // 이전 처방인 경우 이전 병원 가져오기
  useEffect(() => {
    if (visitType !== "followup" || !recordId) return;

    let cancelled = false;
    (async () => {
      try {
        const patientId = getOrCreatePatientId();
        const data = await getRecords({ patientId });
        const record = data.records.find((r) => r.id === recordId);
        if (!cancelled && record?.hospitalName) {
          setDefaultHospitalName(record.hospitalName);
        }
      } catch (error) {
        console.error("Failed to get previous hospital:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visitType, recordId]);

  const handleSelectHospital = async (facility: Facility) => {
    setLoading(true);
    try {
      const patientId = getOrCreatePatientId();

      // sessionStorage에서 문진표 데이터 가져오기
      const questionnaireDataStr = sessionStorage.getItem("questionnaireData");
      if (!questionnaireDataStr) {
        alert("문진표 데이터를 찾을 수 없습니다. 다시 시도해주세요.");
        router.push("/hospital-visit");
        return;
      }

      const questionnaireData: QuestionnaireData =
        JSON.parse(questionnaireDataStr);

      // 1. IntakeForm 생성
      await createIntakeForm({
        patientId,
        facilityId: facility.id,
        visitType: visitType === "new" ? "new_symptom" : "followup",
        relatedRecordId: recordId || undefined,
        chiefComplaint: questionnaireData.chiefComplaint || "",
        onsetText: questionnaireData.symptomStart,
        course: mapCourseType(questionnaireData.symptomProgress),
        adherence: mapAdherenceType(questionnaireData.medicationCompliance),
        adverseEvents: questionnaireData.sideEffects,
        allergies: questionnaireData.allergies,
      });

      // 2. ShareToken 생성
      const { token } = await createShareToken({
        patientId,
        facilityId: facility.id,
      });

      // 3. sessionStorage 정리
      sessionStorage.removeItem("questionnaireData");

      // 4. QR 페이지로 이동
      router.push(`/share?token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.error("Failed to create intake form:", error);
      alert("문진표 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "var(--color-background)" }}
    >
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
          }}
        >
          병원 선택
        </h1>
        <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
          {visitType === "new"
            ? "방문하실 병원을 검색해주세요"
            : "이전에 방문하신 병원 또는 다른 병원을 선택해주세요"}
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: "24px" }}>
        {defaultHospitalName && (
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
              border: "2px solid #FCD34D",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: "700",
                color: "#92400E",
                marginBottom: "4px",
              }}
            >
              이전 방문 병원
            </p>
            <p
              style={{
                fontSize: "1.0625rem",
                fontWeight: "800",
                color: "#78350F",
              }}
            >
              {defaultHospitalName}
            </p>
          </div>
        )}

        <HospitalSearchWithAI
          symptoms={symptoms}
          onSelect={handleSelectHospital}
          initialKeyword={defaultHospitalName}
        />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
              style={{ borderColor: "#285BAA" }}
            ></div>
            <p style={{ fontWeight: "600", color: "var(--color-text-primary)" }}>
              문진표를 저장하고 있습니다...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HospitalSelectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      }
    >
      <HospitalSelectContent />
    </Suspense>
  );
}
