"use client";

import { AuthView } from "@/legacy/components/AuthView";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  return <AuthView onDone={() => router.replace("/")} />;
}


