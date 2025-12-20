"use client";

import { Home } from "@/widgets/home/Home";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="app-container">
      <Home
        recordCount={0}
        onLogin={() => router.push("/login")}
        onQuickRecord={() => router.push("/quick-record")}
        onQuestionnaire={() => router.push("/questionnaire")}
        onHistory={() => router.push("/")}
      />
    </div>
  );
}
