"use client";

import { AuthView } from "@/widgets/auth/AuthView";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  return (
    // 뒤로가기 시 히스토리 문제를 피하기 위해 항상 홈으로 이동
    <AuthView onBack={() => router.replace("/")} onDone={() => router.replace("/")} />
  );
}
