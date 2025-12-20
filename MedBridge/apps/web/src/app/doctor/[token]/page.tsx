"use client";

import DoctorShareClient from "./ui/DoctorShareClient";

export default function DoctorSharePage({ params }: any) {
  // Next 16 dev 모드에서 params가 Promise처럼 동작하는 케이스가 있어 안전하게 await 경유
  return <DoctorShareClient params={params} />;
}


