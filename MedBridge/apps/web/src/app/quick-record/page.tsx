"use client";

import { QuickRecord } from "@/legacy/components/QuickRecord";
import { useRouter } from "next/navigation";

export default function QuickRecordPage() {
  const router = useRouter();

  return (
    <QuickRecord
      onBack={() => router.push("/")}
      onRecordSaved={() => router.push("/")}
    />
  );
}


