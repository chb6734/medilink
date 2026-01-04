import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
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
        className="ai-analysis-content"
        style={{
          padding: "20px",
          background: GRADIENTS.aiAnalysis,
          borderRadius: "12px",
          fontSize: "0.9375rem",
          color: "#075985",
          lineHeight: "1.8",
        }}
      >
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#0C4A6E",
                  marginTop: "24px",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "2px solid #0EA5E9",
                }}
              >
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h4
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  color: "#0C4A6E",
                  marginTop: "20px",
                  marginBottom: "10px",
                  paddingBottom: "6px",
                  borderBottom: "1px solid #BAE6FD",
                }}
              >
                {children}
              </h4>
            ),
            h3: ({ children }) => (
              <h5
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "#075985",
                  marginTop: "16px",
                  marginBottom: "8px",
                }}
              >
                {children}
              </h5>
            ),
            p: ({ children }) => (
              <p
                style={{
                  marginBottom: "12px",
                  lineHeight: "1.8",
                }}
              >
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul
                style={{
                  marginBottom: "12px",
                  paddingLeft: "20px",
                }}
              >
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol
                style={{
                  marginBottom: "12px",
                  paddingLeft: "20px",
                }}
              >
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li
                style={{
                  marginBottom: "6px",
                  lineHeight: "1.7",
                }}
              >
                {children}
              </li>
            ),
            strong: ({ children }) => (
              <strong
                style={{
                  fontWeight: "700",
                  color: "#0C4A6E",
                }}
              >
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em
                style={{
                  fontStyle: "italic",
                  color: "#0369A1",
                }}
              >
                {children}
              </em>
            ),
            hr: () => (
              <hr
                style={{
                  border: "none",
                  borderTop: "1px dashed #7DD3FC",
                  margin: "16px 0",
                }}
              />
            ),
          }}
        >
          {aiAnalysis}
        </ReactMarkdown>
      </div>
    </div>
  );
}
