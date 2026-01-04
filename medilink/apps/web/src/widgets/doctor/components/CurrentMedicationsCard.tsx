import { Pill, CheckCircle } from "lucide-react";
import type { CurrentMedication } from "../lib/types";
import { COLORS, GRADIENTS } from "../lib/constants";

interface CurrentMedicationsCardProps {
  medications: CurrentMedication[];
}

export function CurrentMedicationsCard({
  medications,
}: CurrentMedicationsCardProps) {
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
          marginBottom: "20px",
        }}
      >
        <Pill className="w-5 h-5" style={{ color: COLORS.primary }} />
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "700",
            color: COLORS.textPrimary,
            marginBottom: 0,
          }}
        >
          현재 복용 중인 약
        </h2>
      </div>

      <div className="space-y-3">
        {medications.length > 0 ? (
          medications.map((med, idx) => (
            <div
              key={med.id}
              style={{
                padding: "16px",
                background: idx === 0 ? GRADIENTS.cardHighlight : "#F8FAFC",
                borderRadius: "12px",
                border: "1px solid #CBD5E1",
                position: "relative",
              }}
            >
              {med.confidence && med.confidence >= 90 && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: GRADIENTS.success,
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.6875rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <CheckCircle className="w-3 h-3" />
                  {med.confidence}%
                </div>
              )}
              <p
                style={{
                  fontWeight: "700",
                  fontSize: "1rem",
                  color: COLORS.textPrimary,
                  marginBottom: "8px",
                  paddingRight: med.confidence ? "80px" : "0",
                }}
              >
                {med.name}
              </p>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: COLORS.textSecondary,
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontWeight: "600" }}>{med.dosage}</span> ·{" "}
                {med.frequency}
              </div>
              <div style={{ fontSize: "0.8125rem", color: COLORS.textMuted }}>
                처방: {med.prescribedBy || "—"}
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              color: COLORS.textMuted,
              fontSize: "0.875rem",
            }}
          >
            현재 복용 중인 약이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
