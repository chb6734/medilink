"use client";

import { DoctorShare } from "@/widgets/doctor/DoctorShare";
import { useEffect, useState } from "react";

export default function DoctorShareClient({ params }: { params: any }) {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await Promise.resolve(params);
        const raw = String(p?.token ?? "");
        if (cancelled) return;
        setToken(decodeURIComponent(raw));
      } catch {
        if (cancelled) return;
        setToken("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (!token) return null;
  return <DoctorShare token={token} />;
}


