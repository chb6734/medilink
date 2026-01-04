import { AlertCircle } from "lucide-react";
import { GRADIENTS } from "../lib/constants";

interface PatientNotesCardProps {
  notes: string;
}

export function PatientNotesCard({ notes }: PatientNotesCardProps) {
  return (
    <div
      style={{
        background: GRADIENTS.patientNotes,
        padding: "24px",
        borderRadius: "16px",
        border: "2px solid #FCD34D",
        marginBottom: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: GRADIENTS.warning,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AlertCircle className="w-6 h-6" style={{ color: "white" }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "700",
              color: "#92400E",
              marginBottom: "8px",
            }}
          >
            환자 메모
          </h3>
          <p
            style={{
              fontSize: "1rem",
              color: "#78350F",
              lineHeight: "1.6",
              marginBottom: "12px",
            }}
          >
            {notes}
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#92400E",
              marginBottom: 0,
            }}
          >
            환자가 직접 작성한 내용입니다
          </p>
        </div>
      </div>
    </div>
  );
}
