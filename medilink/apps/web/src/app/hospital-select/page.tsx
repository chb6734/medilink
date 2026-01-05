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
  authMe,
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
  const chiefComplaint = searchParams.get("chiefComplaint") || "";
  const symptomDetail = searchParams.get("symptomDetail") || "";
  const rawRecordId = searchParams.get("recordId");
  // UUID 형식인지 간단히 확인 (빈 문자열, "undefined", "null" 등 제외)
  const recordId = rawRecordId && /^[0-9a-f-]{36}$/i.test(rawRecordId) ? rawRecordId : "";

  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [defaultHospitalName, setDefaultHospitalName] = useState<string>("");

  // 인증 체크
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authMe();
        if (cancelled) return;
        if (!me.user) {
          // 로그인 필요 - 현재 URL로 돌아올 수 있도록 returnTo 설정
          const returnParams = new URLSearchParams({ visitType });
          if (chiefComplaint) returnParams.set("chiefComplaint", chiefComplaint);
          if (symptomDetail) returnParams.set("symptomDetail", symptomDetail);
          if (recordId) returnParams.set("recordId", recordId);
          const currentUrl = `/hospital-select?${returnParams.toString()}`;
          router.push(`/login?returnTo=${encodeURIComponent(currentUrl)}`);
          return;
        }
        setAuthChecking(false);
      } catch (e) {
        if (!cancelled) {
          console.error("Auth check failed:", e);
          router.push("/login?returnTo=/hospital-visit");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, visitType, chiefComplaint, symptomDetail, recordId]);

  // 이전 처방인 경우 이전 병원 가져오기
  useEffect(() => {
    if (visitType !== "followup") return;

    let cancelled = false;
    (async () => {
      try {
        // 1. First try to get from sessionStorage (from prescription-capture)
        const storedHospitalName = sessionStorage.getItem('previousHospitalName');
        if (!cancelled && storedHospitalName) {
          setDefaultHospitalName(storedHospitalName);
          // Clean up after use
          sessionStorage.removeItem('previousHospitalName');
          return;
        }

        // 2. Fallback: fetch from records if recordId exists
        if (!recordId) return;

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

      // 외부 API에서 가져온 병원인 경우 DB에 저장
      let facilityId = facility.id;
      if ((facility as any).isExternal) {
        const savedFacility = await findOrCreateFacility({
          name: facility.name,
          type: facility.type,
        });
        facilityId = savedFacility.id;
      }

      // 1. IntakeForm 생성
      await createIntakeForm({
        patientId,
        facilityId,
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
        facilityId,
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

  // 인증 체크 중
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">인증 확인 중...</p>
        </div>
      </div>
    );
  }

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
            color: "white",
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

        {/* 저장 중 안내 메시지 */}
        {loading && (
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
              border: "2px solid #3B82F6",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              className="animate-spin rounded-full h-6 w-6 border-b-2"
              style={{ borderColor: "#3B82F6" }}
            />
            <p style={{ fontWeight: "600", color: "#1E40AF" }}>
              문진표를 저장하고 있습니다...
            </p>
          </div>
        )}

        <HospitalSearchWithAI
          chiefComplaint={chiefComplaint}
          symptomDetail={symptomDetail}
          onSelect={handleSelectHospital}
          initialKeyword={defaultHospitalName}
          disabled={loading}
        />
      </div>
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
