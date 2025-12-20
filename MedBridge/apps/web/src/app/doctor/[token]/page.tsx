"use client";

import { DoctorShare } from "@/widgets/doctor/DoctorShare";

export default function DoctorSharePage({ params }: any) {
  return <DoctorShare token={decodeURIComponent(String(params?.token ?? ""))} />;
}


