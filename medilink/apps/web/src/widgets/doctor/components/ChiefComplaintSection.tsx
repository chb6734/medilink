import { AlertCircle } from "lucide-react";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";
import { COLORS, STATUS_BACKGROUNDS } from "../lib/constants";

interface ChiefComplaintSectionProps {
  questionnaireData: QuestionnaireData;
}

export function ChiefComplaintSection({
  questionnaireData,
}: ChiefComplaintSectionProps) {
  return (
    <div
      style={{
        background: "white",
        padding: "24px",
        borderRadius: "16px",
        border: `1px solid ${COLORS.border}`,
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
        <AlertCircle className="w-5 h-5" style={{ color: COLORS.danger }} />
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "700",
            color: COLORS.textPrimary,
            marginBottom: 0,
          }}
        >
          주요 증상
        </h2>
      </div>

      {/* Chief Complaint Highlight */}
      <div
        style={{
          padding: "16px",
          background: STATUS_BACKGROUNDS.chiefComplaint,
          borderRadius: "12px",
          borderLeft: `4px solid ${COLORS.danger}`,
          marginBottom: "16px",
        }}
      >
        <p
          style={{
            color: "#991B1B",
            fontWeight: "600",
            lineHeight: "1.6",
            marginBottom: questionnaireData.symptomDetail ? "8px" : 0,
          }}
        >
          {questionnaireData.chiefComplaint}
        </p>
        {questionnaireData.symptomDetail && (
          <p
            style={{
              color: "#7F1D1D",
              fontSize: "0.875rem",
              lineHeight: "1.6",
              marginBottom: 0,
            }}
          >
            {questionnaireData.symptomDetail}
          </p>
        )}
      </div>

      {/* Symptom Details */}
      <div className="space-y-3">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: "12px",
            borderBottom: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <span style={{ color: COLORS.textMuted, fontSize: "0.875rem" }}>
            증상 시작
          </span>
          <span
            style={{
              color: COLORS.textPrimary,
              fontWeight: "600",
              fontSize: "0.875rem",
            }}
          >
            {questionnaireData.symptomStart}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: "12px",
            borderBottom: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <span style={{ color: COLORS.textMuted, fontSize: "0.875rem" }}>
            증상 경과
          </span>
          <span
            style={{
              color: COLORS.textPrimary,
              fontWeight: "600",
              fontSize: "0.875rem",
            }}
          >
            {questionnaireData.symptomProgress}
          </span>
        </div>

        {/* Side Effects Warning */}
        {questionnaireData.sideEffects !== "없음" && (
          <div
            style={{
              padding: "12px",
              background: STATUS_BACKGROUNDS.sideEffect,
              borderRadius: "8px",
              marginTop: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: "#92400E" }} />
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: "600",
                  color: "#92400E",
                }}
              >
                부작용 있음
              </span>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#78350F",
                marginBottom: 0,
              }}
            >
              {questionnaireData.sideEffects}
            </p>
          </div>
        )}

        {/* Patient Notes */}
        {questionnaireData.patientNotes && (
          <div
            style={{
              padding: "12px",
              background: "#F0F9FF",
              borderRadius: "8px",
              marginTop: "12px",
              borderLeft: "4px solid #0EA5E9",
            }}
          >
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: "600",
                color: "#0369A1",
                display: "block",
                marginBottom: "4px",
              }}
            >
              환자 메모
            </span>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#0C4A6E",
                lineHeight: "1.6",
                marginBottom: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {questionnaireData.patientNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
