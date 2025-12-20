"use client";

import { Home } from "@/widgets/home/Home";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import { getRecordCount } from "@/shared/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [recordCount, setRecordCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientId = getOrCreatePatientId();
        const resp = await getRecordCount({ patientId, days: 90 });
        if (cancelled) return;
        setRecordCount(resp.count ?? 0);
      } catch (e) {
        // auth 미로그인/서버 미설정 등: 홈은 0으로 안전하게 표시
        if (cancelled) return;
        setRecordCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-container">
      <Home
        recordCount={recordCount}
        onLogin={() => router.push("/login")}
        onQuickRecord={() => router.push("/quick-record")}
        onQuestionnaire={() => router.push("/questionnaire")}
        onHistory={() => router.push("/")}
      />
    </div>
  );
}
