"use client";

import { AuthView } from "@/widgets/auth/AuthView";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  return (
    <AuthView onBack={() => router.back()} onDone={() => router.replace("/")} />
  );
}
