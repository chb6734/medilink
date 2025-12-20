"use client";

import { Questionnaire } from "@/features/questionnaire/ui/Questionnaire";
import { createShareToken } from "@/shared/api";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import { useRouter } from "next/navigation";

export default function QuestionnairePage() {
  const router = useRouter();

  return (
    <Questionnaire
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


