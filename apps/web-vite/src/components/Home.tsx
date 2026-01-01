import { Camera, FileText, Clock, Pill, User, LogIn } from "lucide-react";
import { ViewType } from "../App";

interface HomeProps {
  onNavigate: (view: ViewType) => void;
  recordCount: number;
}

export function Home({ onNavigate, recordCount }: HomeProps) {
  return (
    <div className="min-h-screen pb-24">
      {/* Header with Greeting */}
      <div
        style={{
          background: "var(--gradient-card)",
          padding: "48px 24px 32px",
          borderBottomLeftRadius: "32px",
          borderBottomRightRadius: "32px",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.9375rem",
                opacity: 0.9,
                marginBottom: "4px",
              }}
            >
              안녕하세요 👋
            </p>
            <h1 style={{ color: "white", marginBottom: "24px" }}>연속진료</h1>
          </div>
          <button
            onClick={() => {
              window.location.hash = "#/login";
            }}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "white",
              padding: "10px 12px",
              borderRadius: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 700,
            }}
          >
            <LogIn className="w-4 h-4" />
            로그인
          </button>
        </div>

        {/* Search/Status Bar */}
        <div
          style={{
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Pill className="w-5 h-5" style={{ opacity: 0.9 }} />
          <span style={{ flex: 1, opacity: 0.9 }}>
            내 약 기록 {recordCount}건
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: "24px", marginTop: "12px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={() => onNavigate("quick-record")}
            style={{
              background: "var(--color-surface)",
              borderRadius: "20px",
              padding: "20px 12px",
              border: "1px solid var(--color-border)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 2px 8px rgba(40, 91, 170, 0.06)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow =
                "0 8px 16px rgba(40, 91, 170, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 8px rgba(40, 91, 170, 0.06)";
            }}
          >
            <div className="medical-icon-wrapper">
              <Camera className="w-6 h-6" style={{ color: "white" }} />
            </div>
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-primary)",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              약 촬영
            </span>
          </button>

          <button
            onClick={() => onNavigate("questionnaire")}
            style={{
              background: "var(--color-surface)",
              borderRadius: "20px",
              padding: "20px 12px",
              border: "1px solid var(--color-border)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 2px 8px rgba(40, 91, 170, 0.06)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow =
                "0 8px 16px rgba(40, 91, 170, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 8px rgba(40, 91, 170, 0.06)";
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
              }}
            >
              <FileText className="w-6 h-6" style={{ color: "white" }} />
            </div>
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-primary)",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              병원 방문
            </span>
          </button>

          <button
            onClick={() => onNavigate("history")}
            style={{
              background: "var(--color-surface)",
              borderRadius: "20px",
              padding: "20px 12px",
              border: "1px solid var(--color-border)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 2px 8px rgba(40, 91, 170, 0.06)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow =
                "0 8px 16px rgba(40, 91, 170, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 8px rgba(40, 91, 170, 0.06)";
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)",
              }}
            >
              <Clock className="w-6 h-6" style={{ color: "white" }} />
            </div>
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-primary)",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              복약 기록
            </span>
          </button>
        </div>

        {/* Featured Card */}
        <div className="card-gradient" style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pill className="w-6 h-6" />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: "0.875rem",
                  opacity: 0.9,
                  marginBottom: "2px",
                }}
              >
                등록된 처방 기록
              </p>
              <p style={{ fontSize: "2rem", fontWeight: "800" }}>
                {recordCount}건
              </p>
            </div>
          </div>
          <p style={{ fontSize: "0.875rem", opacity: 0.85, lineHeight: "1.5" }}>
            조제내역서를 촬영하여 약 기록을 관리하세요
          </p>
        </div>
      </div>
    </div>
  );
}
