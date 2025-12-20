import AppClient from "./ui/AppClient";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
      {/* 기존 Vite SPA를 그대로 마운트해서 기능/디자인을 먼저 살린 뒤,
          이후 단계에서 Next 라우트(/doctor/[token] 등)로 점진 분리합니다. */}
      <AppClient />
    </div>
  );
}
