"use client";

import { Home } from "@/widgets/home/Home";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import { authLogout, authMe, getRecordCount } from "@/shared/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [recordCount, setRecordCount] = useState<number>(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientId = getOrCreatePatientId();
        const [me, resp] = await Promise.all([
          authMe().catch(() => ({ authEnabled: false, user: null })),
          getRecordCount({ patientId, days: 90 }),
        ]);
        if (cancelled) return;
        setRecordCount(resp.count ?? 0);
        setUser(me.user ?? null);
      } catch (e) {
        // auth 미로그인/서버 미설정 등: 홈은 0으로 안전하게 표시
        if (cancelled) return;
        setRecordCount(0);
        setUser(null);
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
        user={user}
        onLogin={() => router.push("/login")}
        onLogout={async () => {
          try {
            await authLogout();
          } finally {
            setUser(null);
          }
        }}
        onQuickRecord={() => router.push("/quick-record")}
        onQuestionnaire={() => router.push("/hospital-visit")}
        onHistory={() => router.push("/medication-history")}
        onDoctorPreview={() => router.push("/doctor-preview")}
      />
    </div>
  );
}
