"use client";

import { DoctorShare } from "@/legacy/components/DoctorShare";

export default function DoctorSharePage({ params }: any) {
  return <DoctorShare token={decodeURIComponent(String(params?.token ?? ""))} />;
}


