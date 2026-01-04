import { Sparkles } from "lucide-react";
import { GRADIENTS } from "../lib/constants";

interface AIAnalysisCardProps {
  aiAnalysis: string;
}

export function AIAnalysisCard({ aiAnalysis }: AIAnalysisCardProps) {
  return (
    <div
      style={{
        background: "white",
        padding: "24px",
        borderRadius: "16px",
        border: "2px solid #0EA5E9",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <Sparkles className="w-5 h-5" style={{ color: "#0EA5E9" }} />
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "700",
            color: "#0C4A6E",
            marginBottom: 0,
          }}
        >
          AI 환자 상태 분석
        </h2>
      </div>
      <div
        style={{
          padding: "20px",
          background: GRADIENTS.aiAnalysis,
          borderRadius: "12px",
          fontSize: "0.9375rem",
          color: "#075985",
          lineHeight: "1.8",
          whiteSpace: "pre-wrap",
        }}
      >
        {aiAnalysis}
      </div>
    </div>
  );
}
