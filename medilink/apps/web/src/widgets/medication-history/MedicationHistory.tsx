"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Pill,
  CheckCircle,
  Circle,
  TrendingUp,
  Trash2,
  Edit2,
  Plus,
} from "lucide-react";
import { getRecords, deleteRecord } from "@/shared/api";
import type { PrescriptionRecord } from "@/entities/record/model/types";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";
import { AdherenceChart } from "@/features/adherence";
import { MedicationCheckList } from "@/features/medication-check";

interface MedicationHistoryProps {
  onBack: () => void;
}

export function MedicationHistory({ onBack }: MedicationHistoryProps) {
  const router = useRouter();
  const [records, setRecords] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"active" | "completed">("active");
  const [adherenceRefreshKey, setAdherenceRefreshKey] = useState(0);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const patientId = getOrCreatePatientId();
      const data = await getRecords({ patientId });
      setRecords(data.records);
    } catch (e: any) {
      console.error("복약 기록 로드 실패:", e);
      if (e.message === "unauthorized" || e.status === 401) {
        const returnTo = window.location.pathname;
        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 진행 중인 처방과 완료된 처방 분리
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeRecords = records.filter((record) => {
    if (!record.daysSupply || !record.prescriptionDate) return false;
    const endDate = new Date(record.prescriptionDate);
    endDate.setDate(endDate.getDate() + record.daysSupply);
    return endDate >= today;
  });

  const completedRecords = records.filter((record) => {
    if (!record.daysSupply || !record.prescriptionDate) return false;
    const endDate = new Date(record.prescriptionDate);
    endDate.setDate(endDate.getDate() + record.daysSupply);
    return endDate < today;
  });

  const displayRecords = selectedTab === "active" ? activeRecords : completedRecords;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #285BAA 0%, #1e4680 100%)",
          padding: "48px 24px 32px",
          color: "white",
          borderBottomLeftRadius: "32px",
          borderBottomRightRadius: "32px",
        }}
      >
        <button
          onClick={onBack}
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
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <Pill className="w-8 h-8" style={{ color: "white" }} />
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "white", margin: 0 }}>복약 기록</h1>
        </div>
        <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
          처방 정보를 관리하고 복약 상태를 확인하세요
        </p>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: "16px",
              backdropFilter: "blur(10px)",
            }}
          >
            <p style={{ fontSize: "0.75rem", opacity: 0.9, marginBottom: "4px" }}>진행 중</p>
            <p style={{ fontSize: "1.75rem", fontWeight: "800" }}>{activeRecords.length}건</p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: "16px",
              backdropFilter: "blur(10px)",
            }}
          >
            <p style={{ fontSize: "0.75rem", opacity: 0.9, marginBottom: "4px" }}>완료됨</p>
            <p style={{ fontSize: "1.75rem", fontWeight: "800" }}>{completedRecords.length}건</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px" }}>
        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            background: "white",
            borderRadius: "16px",
            padding: "6px",
            border: "2px solid #E5E7EB",
          }}
        >
          <button
            onClick={() => setSelectedTab("active")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: selectedTab === "active" ? "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)" : "transparent",
              color: selectedTab === "active" ? "white" : "#6B7280",
              fontWeight: "700",
              fontSize: "0.9375rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            진행 중
          </button>
          <button
            onClick={() => setSelectedTab("completed")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: selectedTab === "completed" ? "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)" : "transparent",
              color: selectedTab === "completed" ? "white" : "#6B7280",
              fontWeight: "700",
              fontSize: "0.9375rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            완료됨
          </button>
        </div>

        {/* Records List */}
        {displayRecords.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "48px 24px",
              textAlign: "center",
              border: "2px solid #E5E7EB",
            }}
          >
            <Calendar style={{ width: "64px", height: "64px", color: "#9CA3AF", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--color-text)", marginBottom: "8px" }}>
              {selectedTab === "active" ? "진행 중인 처방이 없습니다" : "완료된 처방이 없습니다"}
            </h3>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
              {selectedTab === "active" ? "새로운 처방을 추가해보세요" : "처방이 완료되면 여기에 표시됩니다"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {displayRecords.map((record) => (
              <div
                key={record.id}
                style={{
                  background: "white",
                  borderRadius: "20px",
                  border: "2px solid #E5E7EB",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                  style={{
                    width: "100%",
                    padding: "20px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, #285BAA 0%, #3B82F6 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Pill className="w-6 h-6" style={{ color: "white" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "4px" }}>
                        {record.hospitalName || record.pharmacyName || "병원/약국"}
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        {formatDate(record.prescriptionDate)} · {record.daysSupply}일분
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {record.medications.slice(0, 3).map((med, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "6px 12px",
                          background: "#F3F4F6",
                          borderRadius: "8px",
                          fontSize: "0.8125rem",
                          color: "#6B7280",
                          fontWeight: "600",
                        }}
                      >
                        {med.name}
                      </span>
                    ))}
                    {record.medications.length > 3 && (
                      <span
                        style={{
                          padding: "6px 12px",
                          background: "#F3F4F6",
                          borderRadius: "8px",
                          fontSize: "0.8125rem",
                          color: "#6B7280",
                          fontWeight: "600",
                        }}
                      >
                        +{record.medications.length - 3}
                      </span>
                    )}
                  </div>
                </button>

                {expandedRecord === record.id && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid #E5E7EB", paddingTop: "20px" }}>
                    {/* 순응도 그래프 */}
                    <div style={{ marginBottom: "24px" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "16px" }}>복약 순응도</h3>
                      <AdherenceChart recordId={record.id} refreshKey={adherenceRefreshKey} />
                    </div>

                    {/* 처방 정보 수정/삭제 버튼 */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                      <button
                        onClick={() => router.push(`/medication-history/${record.id}/edit`)}
                        style={{
                          flex: 1,
                          padding: "14px",
                          borderRadius: "12px",
                          border: "2px solid #3B82F6",
                          background: "white",
                          color: "#3B82F6",
                          fontSize: "0.9375rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                        처방 수정
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm("정말 이 처방을 삭제하시겠습니까?")) {
                            try {
                              await deleteRecord(record.id);
                              // 목록에서 해당 기록 제거
                              setRecords((prev) => prev.filter((r) => r.id !== record.id));
                              setExpandedRecord(null);
                            } catch (error) {
                              console.error("처방 삭제 실패:", error);
                              alert("처방 삭제에 실패했습니다. 다시 시도해주세요.");
                            }
                          }
                        }}
                        style={{
                          padding: "14px",
                          borderRadius: "12px",
                          border: "2px solid #EF4444",
                          background: "white",
                          color: "#EF4444",
                          fontSize: "0.9375rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 복약 체크 */}
                    <div style={{ marginBottom: "24px" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "12px" }}>복약 체크</h3>
                      <MedicationCheckList
                        recordId={record.id}
                        onCheckUpdate={() => {
                          loadRecords();
                          setAdherenceRefreshKey((prev) => prev + 1);
                        }}
                      />
                    </div>

                    {/* 약물 목록 */}
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "12px" }}>처방 약물</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {record.medications.map((med) => (
                          <div
                            key={med.id}
                            style={{
                              padding: "16px",
                              background: "#F9FAFB",
                              borderRadius: "12px",
                              border: "1px solid #E5E7EB",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <p style={{ fontSize: "1rem", fontWeight: "700", flex: 1 }}>{med.name}</p>
                              <button
                                onClick={() => router.push(`/medication-history/${record.id}/medications/${med.id}/edit`)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#3B82F6",
                                  cursor: "pointer",
                                  fontSize: "0.8125rem",
                                  fontWeight: "600",
                                  padding: "4px 8px",
                                }}
                              >
                                수정
                              </button>
                            </div>
                            <div style={{ display: "flex", gap: "16px", fontSize: "0.875rem", color: "#6B7280" }}>
                              <span>💊 {med.dosage}</span>
                              <span>🕐 {med.frequency}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
