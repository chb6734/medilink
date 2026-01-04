import {
  PatientInfoHeader,
  ChiefComplaintSection,
  AIAnalysisCard,
  MedicationTrackingSection,
  CurrentMedicationsCard,
  PatientNotesCard,
} from "./components";
import {
  type DoctorViewProps,
  type DoctorPatient,
  type MedicationHistoryItem,
  type CurrentMedication,
  DEFAULT_PATIENT,
} from "./lib/types";
import {
  convertToTrackingFormat,
  calculateAdherenceRate,
} from "./lib/medicationUtils";
import { COLORS } from "./lib/constants";

// Re-export types for backward compatibility
export type { DoctorPatient, MedicationHistoryItem, CurrentMedication };

export function DoctorView({
  records,
  questionnaireData,
  patient,
  aiAnalysis,
  medicationHistory = [],
  currentMedications = [],
}: DoctorViewProps) {
  const p = patient ?? DEFAULT_PATIENT;

  // Get today's date (end of day for filtering)
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Convert medication history to tracking format
  const medicationTracking = convertToTrackingFormat(medicationHistory, today);

  // Calculate adherence rate
  const adherenceRate = calculateAdherenceRate(medicationTracking);

  // Get latest prescription date
  const latestPrescriptionDate =
    records.length > 0
      ? new Date(records[0].prescriptionDate).toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        })
      : null;

  return (
    <div className="min-h-screen" style={{ background: COLORS.background }}>
      {/* Patient Info Header */}
      <PatientInfoHeader
        patient={p}
        adherenceRate={adherenceRate}
        latestPrescriptionDate={latestPrescriptionDate}
      />

      {/* Main Content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            paddingBottom: "40px",
          }}
        >
          {/* Chief Complaint */}
          {questionnaireData ? (
            <ChiefComplaintSection questionnaireData={questionnaireData} />
          ) : (
            <div
              style={{
                padding: "20px",
                background: "white",
                borderRadius: "12px",
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  marginBottom: "8px",
                }}
              >
                문진표 정보 없음
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: COLORS.textMuted,
                  lineHeight: "1.6",
                  marginBottom: 0,
                }}
              >
                환자가 아직 문진표를 작성하지 않았습니다.
              </p>
            </div>
          )}

          {/* AI Analysis */}
          {aiAnalysis && <AIAnalysisCard aiAnalysis={aiAnalysis} />}

          {/* Medication Tracking Timeline */}
          <MedicationTrackingSection medicationTracking={medicationTracking} />

          {/* Current Medications */}
          <CurrentMedicationsCard medications={currentMedications} />

          {/* Patient Notes */}
          {questionnaireData?.patientNotes && (
            <PatientNotesCard notes={questionnaireData.patientNotes} />
          )}

          {/* Disclaimer Footer */}
          <div
            style={{
              padding: "20px",
              background: "white",
              borderRadius: "12px",
              border: `1px solid ${COLORS.border}`,
              textAlign: "center",
              marginBottom: "40px",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: COLORS.textMuted,
                lineHeight: "1.6",
                marginBottom: 0,
              }}
            >
              본 정보는 환자가 제공한 자료를 기반으로 구성되었습니다.
              <br />
              진료 시 환자와 직접 확인하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
