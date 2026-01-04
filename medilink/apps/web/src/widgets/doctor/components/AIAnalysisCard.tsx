import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { GRADIENTS } from "../lib/constants";

interface AIAnalysisCardProps {
  aiAnalysis: string;
}

export function AIAnalysisCard({ aiAnalysis }: AIAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isLongContent = aiAnalysis.length > 500;

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
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
        {isLongContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              background: "#E0F2FE",
              border: "none",
              borderRadius: "8px",
              color: "#0369A1",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {isExpanded ? (
              <>
                접기 <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                펼치기 <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
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
          wordBreak: "keep-all",
          overflowWrap: "break-word",
          maxHeight: isExpanded ? "none" : "300px",
          overflow: isExpanded ? "visible" : "hidden",
          position: "relative",
        }}
      >
        {aiAnalysis}
        {!isExpanded && isLongContent && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "80px",
              background:
                "linear-gradient(transparent, rgba(224, 242, 254, 0.9), #E0F2FE)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}
