"use client";

import { Questionnaire } from "@/features/questionnaire/ui/Questionnaire";
import { createShareToken } from "@/shared/api";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import { useRouter, useSearchParams } from "next/navigation";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { Suspense } from "react";

function QuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get visit type from URL params (from hospital-visit page)
  const visitType = searchParams.get("visitType") || "new";
  const recordId = searchParams.get("recordId") || undefined;

  return (
    <Questionnaire
      initialData={{}}
      visitType={visitType as "new" | "followup"}
      relatedRecordId={recordId}
      onBack={() => router.replace("/hospital-visit")}
      onComplete={async (data: QuestionnaireData) => {
        // 1. sessionStorage에 문진표 데이터 저장
        sessionStorage.setItem("questionnaireData", JSON.stringify(data));

        // 2. 새로운 증상: AI 진료과 추천 → 병원 선택
        if (visitType === "new") {
          const params = new URLSearchParams({ visitType: "new" });
          if (data.chiefComplaint) {
            params.set("chiefComplaint", data.chiefComplaint);
          }
          if (data.symptomDetail) {
            params.set("symptomDetail", data.symptomDetail);
          }
          router.push(`/hospital-select?${params.toString()}`);
          return;
        }

        // 3. 이전 처방: 병원 선택 (기본값: 이전 병원)
        if (visitType === "followup") {
          const params = new URLSearchParams({ visitType: "followup" });
          if (recordId) params.set("recordId", recordId);
          router.push(`/hospital-select?${params.toString()}`);
          return;
        }

        // Fallback: 병원 선택 페이지로 이동
        router.push(`/hospital-select?visitType=${visitType}`);
      }}
    />
  );
}

export default function QuestionnairePage() {
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
      <QuestionnaireContent />
    </Suspense>
  );
}


