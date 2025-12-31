"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authMe, getRecords } from "@/shared/api";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import { ArrowLeft, Building2, Clock, FileText, Pill } from "lucide-react";
import type { PrescriptionRecord } from "@/entities/record/model/types";

export default function HospitalVisitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<PrescriptionRecord[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [visitType, setVisitType] = useState<"new" | "followup" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientId = getOrCreatePatientId();
        const [me, recordsData] = await Promise.all([
          authMe(),
          getRecords({ patientId }).catch(() => ({ records: [] })),
        ]);

        if (cancelled) return;

        // Check if user is logged in
        if (!me.user) {
          // Redirect to login with return URL
          router.push("/login?returnTo=/hospital-visit");
          return;
        }

        setUser(me.user);
        setRecords(recordsData.records || []);
      } catch (e) {
        console.error("Failed to load user data:", e);
        // Redirect to login on error
        router.push("/login?returnTo=/hospital-visit");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleContinue = () => {
    if (!selectedHospital || !visitType) return;

    const params = new URLSearchParams({
      hospital: selectedHospital,
      visitType,
    });

    if (visitType === "followup" && selectedRecord) {
      params.set("recordId", selectedRecord);
    }

    router.push(`/questionnaire?${params.toString()}`);
  };

  // Get unique hospitals from records
  const hospitals = Array.from(
    new Set(
      records
        .map((r) => r.hospitalName)
        .filter((name): name is string => !!name)
    )
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <div
        style={{
          background: "var(--gradient-card)",
          padding: "48px 24px 32px",
          borderBottomLeftRadius: "32px",
          borderBottomRightRadius: "32px",
          color: "white",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            padding: "8px",
            borderRadius: "12px",
            color: "white",
            cursor: "pointer",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "800", marginBottom: "8px" }}>
          병원 방문
        </h1>
        <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
          방문할 병원과 목적을 선택해주세요
        </p>
      </div>

      <div style={{ padding: "24px" }}>
        {/* Step 1: Hospital Selection */}
        <div style={{ marginBottom: "32px" }}>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: "700",
              marginBottom: "16px",
              color: "var(--color-text-primary)",
            }}
          >
            1. 방문할 병원 선택
          </h2>

          {hospitals.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {hospitals.map((hospital) => (
                <button
                  key={hospital}
                  onClick={() => setSelectedHospital(hospital)}
                  style={{
                    background:
                      selectedHospital === hospital
                        ? "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)"
                        : "var(--color-surface)",
                    border:
                      selectedHospital === hospital
                        ? "2px solid #285BAA"
                        : "1px solid var(--color-border)",
                    borderRadius: "16px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    color:
                      selectedHospital === hospital
                        ? "white"
                        : "var(--color-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background:
                        selectedHospital === hospital
                          ? "rgba(255,255,255,0.2)"
                          : "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Building2 className="w-6 h-6" style={{ color: "white" }} />
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontWeight: "600", fontSize: "1rem" }}>{hospital}</p>
                  </div>
                </button>
              ))}

              {/* Custom Hospital Input */}
              <div>
                <input
                  type="text"
                  placeholder="다른 병원 입력..."
                  value={
                    hospitals.includes(selectedHospital) ? "" : selectedHospital
                  }
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "16px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    fontSize: "1rem",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="병원 이름을 입력해주세요"
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "16px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  fontSize: "1rem",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          )}
        </div>

        {/* Step 2: Visit Type Selection */}
        {selectedHospital && (
          <div style={{ marginBottom: "32px" }}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: "700",
                marginBottom: "16px",
                color: "var(--color-text-primary)",
              }}
            >
              2. 방문 목적 선택
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* New Symptom */}
              <button
                onClick={() => {
                  setVisitType("new");
                  setSelectedRecord(null);
                }}
                style={{
                  background:
                    visitType === "new"
                      ? "linear-gradient(135deg, #10B981 0%, #34D399 100%)"
                      : "var(--color-surface)",
                  border:
                    visitType === "new"
                      ? "2px solid #10B981"
                      : "1px solid var(--color-border)",
                  borderRadius: "16px",
                  padding: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  color:
                    visitType === "new" ? "white" : "var(--color-text-primary)",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background:
                        visitType === "new"
                          ? "rgba(255,255,255,0.2)"
                          : "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText className="w-6 h-6" style={{ color: "white" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "4px" }}>
                      새로운 증상
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        opacity: 0.8,
                      }}
                    >
                      처음 겪는 증상이나 새로운 문제로 방문
                    </p>
                  </div>
                </div>
              </button>

              {/* Follow-up Visit */}
              <button
                onClick={() => setVisitType("followup")}
                style={{
                  background:
                    visitType === "followup"
                      ? "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)"
                      : "var(--color-surface)",
                  border:
                    visitType === "followup"
                      ? "2px solid #F59E0B"
                      : "1px solid var(--color-border)",
                  borderRadius: "16px",
                  padding: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  color:
                    visitType === "followup"
                      ? "white"
                      : "var(--color-text-primary)",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background:
                        visitType === "followup"
                          ? "rgba(255,255,255,0.2)"
                          : "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Clock className="w-6 h-6" style={{ color: "white" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "4px" }}>
                      이전 처방 관련
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        opacity: 0.8,
                      }}
                    >
                      이전에 받은 처방과 관련된 증상으로 재방문
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Related Prescription Selection (if follow-up) */}
        {visitType === "followup" && records.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: "700",
                marginBottom: "16px",
                color: "var(--color-text-primary)",
              }}
            >
              3. 관련 처방 선택 (선택사항)
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {records.slice(0, 5).map((record) => (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecord(record.id)}
                  style={{
                    background:
                      selectedRecord === record.id
                        ? "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)"
                        : "var(--color-surface)",
                    border:
                      selectedRecord === record.id
                        ? "2px solid #8B5CF6"
                        : "1px solid var(--color-border)",
                    borderRadius: "16px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    color:
                      selectedRecord === record.id
                        ? "white"
                        : "var(--color-text-primary)",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background:
                          selectedRecord === record.id
                            ? "rgba(255,255,255,0.2)"
                            : "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Pill className="w-5 h-5" style={{ color: "white" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: "600", fontSize: "0.9375rem" }}>
                        {record.prescriptionDate}
                      </p>
                      <p style={{ fontSize: "0.8125rem", opacity: 0.8 }}>
                        {record.diagnosis || record.chiefComplaint || "진단 정보 없음"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        {selectedHospital && visitType && (
          <button
            onClick={handleContinue}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              border: "none",
              background: "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)",
              color: "white",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(40, 91, 170, 0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(40, 91, 170, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 91, 170, 0.3)";
            }}
          >
            문진표 작성하기
          </button>
        )}
      </div>
    </div>
  );
}
