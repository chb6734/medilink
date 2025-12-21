import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Droplet,
  Pill,
  Sparkles,
  User as UserIcon,
  Ruler,
  Weight,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PrescriptionRecord } from "@/entities/record/model/types";
import type { QuestionnaireData } from "@/entities/questionnaire/model/types";

export type DoctorPatient = {
  name: string;
  phone: string;
  age?: number;
  bloodType?: string;
  height?: number;
  weight?: number;
};

interface DoctorViewProps {
  records: PrescriptionRecord[];
  questionnaireData: QuestionnaireData | null;
  patient?: DoctorPatient;
}

function generateMedicationTracking() {
  const days = 14;
  const tracking: Array<{
    date: Date;
    dateStr: string;
    dayOfWeek: string;
    taken: boolean;
    symptomLevel: number;
    notes: string | null;
  }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    tracking.push({
      date,
      dateStr: date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      dayOfWeek: date.toLocaleDateString("ko-KR", { weekday: "short" }),
      taken: Math.random() > 0.2,
      symptomLevel: Math.floor(Math.random() * 5) + 1,
      notes:
        Math.random() > 0.7
          ? ["두통 완화됨", "약간 어지러움", "상태 호전", "컨디션 좋음"][
              Math.floor(Math.random() * 4)
            ]
          : null,
    });
  }

  return tracking;
}

const DEFAULT_PATIENT: DoctorPatient = {
  name: "홍길동",
  phone: "010-0000-0000",
  age: 34,
  bloodType: "A+",
  height: 172,
  weight: 68,
};

export function DoctorView({ records, questionnaireData, patient }: DoctorViewProps) {
  const p = patient ?? DEFAULT_PATIENT;
  const [medicationTracking] = useState(generateMedicationTracking());

  const adherenceRate = Math.round(
    (medicationTracking.filter((d) => d.taken).length / medicationTracking.length) * 100,
  );

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      {/* Unified Header with Patient Info */}
      <div
        style={{
          background: "linear-gradient(135deg, #285BAA 0%, #1e4680 100%)",
          padding: "24px 24px 32px",
          color: "white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          borderBottomLeftRadius: "32px",
          borderBottomRightRadius: "32px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Simple Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "28px",
            }}
          >
            <h1
              style={{
                color: "white",
                fontSize: "1.5rem",
                marginBottom: 0,
                fontWeight: "700",
              }}
            >
              환자 진료 요약
            </h1>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.875rem",
                fontWeight: "600",
                backdropFilter: "blur(10px)",
              }}
            >
              연속진료
            </div>
          </div>

          {/* Patient Avatar and Name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "24px",
              paddingBottom: "24px",
              borderBottom: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "18px",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid rgba(255,255,255,0.5)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <UserIcon className="w-9 h-9" style={{ color: "white" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  color: "white",
                  fontSize: "1.75rem",
                  marginBottom: "4px",
                  fontWeight: "700",
                }}
              >
                {p.name}
              </h2>
              <p style={{ opacity: 0.9, fontSize: "0.9375rem", marginBottom: 0 }}>
                {p.phone}
              </p>
            </div>
          </div>

          {/* Patient Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
            }}
          >
            {/* Blood Type */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "16px 12px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <Droplet className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.85, marginBottom: "6px", fontWeight: "600" }}>
                혈액형
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>{p.bloodType || "N/A"}</div>
            </div>

            {/* Height */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "16px 12px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(59, 130, 246, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <Ruler className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.85, marginBottom: "6px", fontWeight: "600" }}>
                키
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>
                {p.height ? `${p.height}cm` : "N/A"}
              </div>
            </div>

            {/* Weight */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "16px 12px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <Weight className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.85, marginBottom: "6px", fontWeight: "600" }}>
                몸무게
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>
                {p.weight ? `${p.weight}kg` : "N/A"}
              </div>
            </div>

            {/* Age */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "16px 12px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(168, 85, 247, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <UserIcon className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.85, marginBottom: "6px", fontWeight: "600" }}>
                나이
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>{p.age ? `${p.age}세` : "N/A"}</div>
            </div>

            {/* Adherence Rate */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "16px 12px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.85, marginBottom: "6px", fontWeight: "600" }}>
                복약순응도
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>{adherenceRate}%</div>
            </div>

            {/* Latest Prescription */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "16px 12px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <Calendar className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.85, marginBottom: "6px", fontWeight: "600" }}>
                최근 처방
              </div>
              <div style={{ fontSize: "0.8125rem", fontWeight: "700", lineHeight: "1.3" }}>
                {records.length > 0
                  ? new Date(records[0].prescriptionDate).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })
                  : "없음"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>
          {/* Chief Complaint */}
          {questionnaireData && (
            <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <AlertCircle className="w-5 h-5" style={{ color: "#EF4444" }} />
                <h2 style={{ fontSize: "1.125rem", fontWeight: "700", color: "#0F172A", marginBottom: 0 }}>
                  주요 증상
                </h2>
              </div>
              <div style={{ padding: "16px", background: "#FEF2F2", borderRadius: "12px", borderLeft: "4px solid #EF4444", marginBottom: "16px" }}>
                <p style={{ color: "#991B1B", fontWeight: "600", lineHeight: "1.6" }}>
                  {questionnaireData.chiefComplaint}
                </p>
              </div>
              <div className="space-y-3">
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid #F1F5F9" }}>
                  <span style={{ color: "#64748B", fontSize: "0.875rem" }}>증상 시작</span>
                  <span style={{ color: "#0F172A", fontWeight: "600", fontSize: "0.875rem" }}>
                    {questionnaireData.symptomStart}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid #F1F5F9" }}>
                  <span style={{ color: "#64748B", fontSize: "0.875rem" }}>증상 경과</span>
                  <span style={{ color: "#0F172A", fontWeight: "600", fontSize: "0.875rem" }}>
                    {questionnaireData.symptomProgress}
                  </span>
                </div>
                {questionnaireData.sideEffects !== "없음" && (
                  <div style={{ padding: "12px", background: "#FEF3C7", borderRadius: "8px", marginTop: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <AlertCircle className="w-4 h-4" style={{ color: "#92400E" }} />
                      <span style={{ fontSize: "0.8125rem", fontWeight: "600", color: "#92400E" }}>
                        부작용 있음
                      </span>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#78350F", marginBottom: 0 }}>
                      {questionnaireData.sideEffects}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Medications - AI Analyzed */}
          <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Pill className="w-5 h-5" style={{ color: "#285BAA" }} />
                <h2 style={{ fontSize: "1.125rem", fontWeight: "700", color: "#0F172A", marginBottom: 0 }}>
                  현재 복용 중인 약
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "600", color: "white" }}>
                <Sparkles className="w-3 h-3" />
                AI 분석
              </div>
            </div>

            <div className="space-y-3">
              {records.slice(0, 1).flatMap((record) =>
                record.medications.map((med, idx) => (
                  <div key={med.id} style={{ padding: "16px", background: idx === 0 ? "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)" : "#F8FAFC", borderRadius: "12px", border: "1px solid #CBD5E1", position: "relative" }}>
                    {med.confidence && med.confidence >= 90 && (
                      <div style={{ position: "absolute", top: "12px", right: "12px", background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", color: "white", padding: "4px 10px", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle className="w-3 h-3" />
                        {med.confidence}%
                      </div>
                    )}
                    <p style={{ fontWeight: "700", fontSize: "1rem", color: "#0F172A", marginBottom: "8px", paddingRight: med.confidence ? "80px" : "0" }}>
                      {med.name}
                    </p>
                    <div style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "6px" }}>
                      <span style={{ fontWeight: "600" }}>{med.dosage}</span> · {med.frequency}
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                      처방: {med.prescribedBy || "—"}
                    </div>
                  </div>
                )),
              )}
            </div>
          </div>

          {/* Medication Tracking Timeline */}
          <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Calendar className="w-5 h-5" style={{ color: "#285BAA" }} />
              <h2 style={{ fontSize: "1.125rem", fontWeight: "700", color: "#0F172A", marginBottom: 0 }}>
                복약 기록 & 상태 변화
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", marginBottom: "24px" }}>
              {medicationTracking.slice(-7).map((day, idx) => (
                <div key={idx} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.6875rem", color: "#94A3B8", marginBottom: "6px", fontWeight: "600" }}>
                    {day.dayOfWeek}
                  </div>
                  <div style={{ width: "100%", aspectRatio: "1", borderRadius: "10px", background: day.taken ? "linear-gradient(135deg, #10B981 0%, #059669 100%)" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px", boxShadow: day.taken ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "none", position: "relative" }}>
                    {day.taken ? (
                      <CheckCircle className="w-5 h-5" style={{ color: "white" }} />
                    ) : (
                      <XCircle className="w-5 h-5" style={{ color: "#CBD5E1" }} />
                    )}
                    <div style={{ position: "absolute", bottom: "-4px", left: "50%", transform: "translateX(-50%)", width: `${day.symptomLevel * 8}px`, height: "4px", borderRadius: "2px", background: day.symptomLevel <= 2 ? "#10B981" : day.symptomLevel <= 3 ? "#F59E0B" : "#EF4444" }} />
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "#64748B", fontWeight: "600" }}>
                    {day.dateStr.split(" ")[1]}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
              <div className="space-y-2">
                {medicationTracking
                  .slice()
                  .reverse()
                  .map((day, idx) => (
                    <div key={idx} style={{ padding: "14px 16px", background: day.taken ? "#F0FDF4" : "#FEF2F2", borderRadius: "10px", border: `1px solid ${day.taken ? "#BBF7D0" : "#FECACA"}`, display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: day.taken ? "linear-gradient(135deg, #10B981 0%, #059669 100%)" : "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {day.taken ? (
                          <CheckCircle className="w-4 h-4" style={{ color: "white" }} />
                        ) : (
                          <XCircle className="w-4 h-4" style={{ color: "white" }} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#0F172A" }}>
                            {day.dateStr}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#64748B" }}>({day.dayOfWeek})</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "0.75rem", color: day.taken ? "#059669" : "#DC2626", fontWeight: "600" }}>
                            {day.taken ? "복용 완료" : "복용 누락"}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "0.6875rem", color: "#64748B" }}>증상</span>
                            <div style={{ display: "flex", gap: "2px" }}>
                              {[1, 2, 3, 4, 5].map((level) => (
                                <div key={level} style={{ width: "6px", height: "6px", borderRadius: "50%", background: level <= day.symptomLevel ? (day.symptomLevel <= 2 ? "#10B981" : day.symptomLevel <= 3 ? "#F59E0B" : "#EF4444") : "#E2E8F0" }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        {day.notes && (
                          <p style={{ fontSize: "0.75rem", color: "#475569", marginTop: "6px", marginBottom: 0, fontStyle: "italic" }}>
                            "{day.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div style={{ marginTop: "20px", padding: "16px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "10px" }}>
                증상 수준
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#10B981" }} />
                  <span style={{ fontSize: "0.6875rem", color: "#64748B" }}>양호 (1-2)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#F59E0B" }} />
                  <span style={{ fontSize: "0.6875rem", color: "#64748B" }}>보통 (3)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#EF4444" }} />
                  <span style={{ fontSize: "0.6875rem", color: "#64748B" }}>주의 (4-5)</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "32px", paddingTop: "32px", borderTop: "2px solid #E2E8F0" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#0F172A", marginBottom: "24px" }}>
                📊 통계 분석
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
                <div style={{ background: "#F8FAFC", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: "700", color: "#475569", marginBottom: "16px" }}>
                    증상 추이 (최근 14일)
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={medicationTracking}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: "#64748B" }} angle={-45} textAnchor="end" height={60} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: "#64748B" }} label={{ value: "증상 수준", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#64748B" } }} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.75rem" }} />
                      <Line type="monotone" dataKey="symptomLevel" stroke="#EF4444" strokeWidth={3} dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="증상 수준" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: "#F8FAFC", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: "700", color: "#475569", marginBottom: "16px" }}>
                    복약 순응도 (최근 14일)
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={medicationTracking}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: "#64748B" }} angle={-45} textAnchor="end" height={60} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#64748B" }} ticks={[0, 1]} tickFormatter={(value) => (value === 1 ? "복용" : "누락")} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.75rem" }} formatter={(value: any) => [value === 1 ? "복용 완료" : "복용 누락", "상태"]} />
                      <Bar dataKey={(item: any) => (item.taken ? 1 : 0)} fill="#10B981" radius={[8, 8, 0, 0]} name="복약 상태" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {questionnaireData && questionnaireData.patientNotes && (
            <div style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)", padding: "24px", borderRadius: "16px", border: "2px solid #FCD34D", marginBottom: "40px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertCircle className="w-6 h-6" style={{ color: "white" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "#92400E", marginBottom: "8px" }}>
                    환자 메모
                  </h3>
                  <p style={{ fontSize: "1rem", color: "#78350F", lineHeight: "1.6", marginBottom: "12px" }}>
                    {questionnaireData.patientNotes}
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "#92400E", marginBottom: 0 }}>
                    ⚠️ 환자가 직접 작성한 내용입니다
                  </p>
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", textAlign: "center", marginBottom: "40px" }}>
            <p style={{ fontSize: "0.875rem", color: "#64748B", lineHeight: "1.6", marginBottom: 0 }}>
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
