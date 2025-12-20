"use client";

import { ShareView } from "@/widgets/share/ShareView";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import { createShareToken } from "@/shared/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function ShareClient() {
  const router = useRouter();
  const search = useSearchParams();

  const tokenFromQuery = useMemo(() => search.get("token") ?? "", [search]);
  const [token, setToken] = useState(tokenFromQuery);

  useEffect(() => {
    if (!tokenFromQuery) return;
    setToken(tokenFromQuery);
  }, [tokenFromQuery]);

  useEffect(() => {
    if (!token) router.replace("/");
  }, [router, token]);

  if (!token) return null;

  return (
    <ShareView
      token={token}
      onBack={() => router.push("/")}
      onRegenerateToken={async () => {
        try {
          const patientId = getOrCreatePatientId();
          const resp = await createShareToken({ patientId });
          setToken(resp.token);
          router.replace(`/share?token=${encodeURIComponent(resp.token)}`);
        } catch (e) {
          const msg = String((e as any)?.message ?? e);
          if (msg.includes("401") || msg.includes("unauthorized")) {
            router.push("/login");
            return;
          }
          const t = Math.random().toString(36).slice(2);
          setToken(t);
          router.replace(`/share?token=${encodeURIComponent(t)}`);
        }
      }}
    />
  );
}


