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

  // Get hospital and visit type from URL params (from hospital-visit page)
  const hospital = searchParams.get("hospital") || "";
  const visitType = searchParams.get("visitType") || "new";
  const recordId = searchParams.get("recordId") || undefined;

  // Prepare initial data if hospital is already selected
  const initialData: Partial<QuestionnaireData> = hospital
    ? { hospitalName: hospital }
    : {};

  return (
    <Questionnaire
      initialData={initialData}
      visitType={visitType as "new" | "followup"}
      relatedRecordId={recordId}
      onBack={() => router.push("/")}
      onComplete={async () => {
        try {
          const patientId = getOrCreatePatientId();
          const { token } = await createShareToken({ patientId });
          router.push(`/share?token=${encodeURIComponent(token)}`);
        } catch (e) {
          const msg = String((e as any)?.message ?? e);
          if (msg.includes("401") || msg.includes("unauthorized")) {
            router.push("/login");
            return;
          }
          // 데모 UX: 토큰 없이도 공유 화면 형태를 보여주기 위해 랜덤 토큰
          const t = Math.random().toString(36).slice(2);
          router.push(`/share?token=${encodeURIComponent(t)}`);
        }
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


