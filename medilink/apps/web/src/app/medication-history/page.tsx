"use client";

import { MedicationHistory } from "@/widgets/medication-history/MedicationHistory";
import { useRouter } from "next/navigation";

export default function MedicationHistoryPage() {
  const router = useRouter();

  return (
    <MedicationHistory
      onBack={() => router.push("/")}
    />
  );
}

