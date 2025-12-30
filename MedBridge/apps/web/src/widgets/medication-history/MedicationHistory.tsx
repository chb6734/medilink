"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Pill,
  CheckCircle,
  Circle,
  TrendingUp,
} from "lucide-react";
import type { PrescriptionRecord } from "@/entities/record/model/types";
import { getRecords, updateRecord } from "@/shared/api";
import { getOrCreatePatientId } from "@/entities/patient/lib/patientId";

interface MedicationHistoryProps {
  onBack: () => void;
}

export function MedicationHistory({ onBack }: MedicationHistoryProps) {
  const [records, setRecords] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientId = getOrCreatePatientId();
        const data = await getRecords({ patientId });
        if (cancelled) return;
        setRecords(data.records);
      } catch (e: any) {
        console.error("복약 기록 로드 실패:", e);
        // 인증 에러 발생 시 로그인 페이지로 리다이렉트
        if (e.message === "unauthorized" || e.status === 401) {
          const returnTo = window.location.pathname;
          window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
          return;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleRecord = (id: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecords(newExpanded);
  };

  const handleDayToggle = async (
    record: PrescriptionRecord,
    dateStr: string
  ) => {
    const updatedLog = { ...(record.dailyLog || {}) };
    updatedLog[dateStr] = !updatedLog[dateStr];

    const updatedRecord = {
      ...record,
      dailyLog: updatedLog,
    };

    // Optimistic update
    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? updatedRecord : r))
    );

    // Update backend
    try {
      await updateRecord({
        recordId: record.id,
        dailyLog: updatedLog,
      });
    } catch (e) {
      console.error("복약 기록 업데이트 실패:", e);
      // Revert on error
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? record : r))
      );
    }
  };

  const handleUpdateRecord = async (updatedRecord: PrescriptionRecord) => {
    // Optimistic update
    setRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );

    // Update backend
    try {
      await updateRecord({
        recordId: updatedRecord.id,
        medications: updatedRecord.medications.map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        })),
        alarmTimes: updatedRecord.alarmTimes,
      });
    } catch (e) {
      console.error("기록 업데이트 실패:", e);
      // Revert on error - would need original record
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const formatDateShort = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDateArray = (startDate: string, daysSupply: number): Date[] => {
    const dates: Date[] = [];
    const start = new Date(startDate);

    for (let i = 0; i < daysSupply; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const getComplianceRate = (record: PrescriptionRecord): number => {
    if (!record.daysSupply || !record.dailyLog) return 0;

    const dates = getDateArray(record.prescriptionDate, record.daysSupply);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 오늘까지만 계산
    const eligibleDates = dates.filter((d) => {
      const checkDate = new Date(d);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate <= today;
    });

    if (eligibleDates.length === 0) return 0;

    const takenCount = eligibleDates.filter((d) => {
      const dateStr = d.toISOString().split("T")[0];
      return record.dailyLog?.[dateStr] === true;
    }).length;

    return Math.round((takenCount / eligibleDates.length) * 100);
  };

  const isDateInFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > today;
  };

  // 진행 중인 처방과 완료된 처방 분리
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeRecords = records.filter((record) => {
    if (!record.daysSupply) return false;
    const dates = getDateArray(record.prescriptionDate, record.daysSupply);
    const lastDate = dates[dates.length - 1];
    lastDate.setHours(0, 0, 0, 0);
    return lastDate >= today;
  });

  const completedRecords = records.filter((record) => {
    if (!record.daysSupply) return false;
    const dates = getDateArray(record.prescriptionDate, record.daysSupply);
    const lastDate = dates[dates.length - 1];
    lastDate.setHours(0, 0, 0, 0);
    return lastDate < today;
  });

  const sortedActiveRecords = [...activeRecords].sort(
    (a, b) =>
      new Date(b.prescriptionDate).getTime() -
      new Date(a.prescriptionDate).getTime()
  );

  const sortedCompletedRecords = [...completedRecords].sort(
    (a, b) =>
      new Date(b.prescriptionDate).getTime() -
      new Date(a.prescriptionDate).getTime()
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-8"
      style={{ background: "var(--color-background)" }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #285BAA 0%, #1e4680 100%)",
          padding: "16px 24px 24px",
          color: "white",
          borderBottomLeftRadius: "24px",
          borderBottomRightRadius: "24px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            padding: "10px",
            borderRadius: "12px",
            cursor: "pointer",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            color: "white",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 style={{ color: "white", marginBottom: "8px" }}>복약 기록</h2>
        <p style={{ opacity: 0.9, fontSize: "0.9375rem" }}>
          매일매일 복약 여부를 기록하세요
        </p>
      </div>

      <div className="px-6 py-6">
        {/* Summary Card */}
        {records.length > 0 && (
          <div
            className="card"
            style={{
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            {/* Summary Stats */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  background: "var(--color-primary-bg)",
                  borderRadius: "12px",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Pill
                  className="w-5 h-5"
                  style={{ color: "var(--color-primary)" }}
                />
              </div>
              <div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "4px",
                  }}
                >
                  전체 처방 기록
                </p>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {records.length}건
                </p>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: "var(--color-background)",
                  borderRadius: "10px",
                  padding: "12px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "4px",
                  }}
                >
                  진행 중
                </p>
                <p
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    color: "var(--color-primary)",
                  }}
                >
                  {activeRecords.length}건
                </p>
              </div>
              <div
                style={{
                  background: "var(--color-background)",
                  borderRadius: "10px",
                  padding: "12px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "4px",
                  }}
                >
                  완료됨
                </p>
                <p
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {completedRecords.length}건
                </p>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: "var(--color-border)",
                marginBottom: "20px",
              }}
            />

            {/* Active Records */}
            {sortedActiveRecords.length > 0 && (
              <div
                style={{
                  marginBottom:
                    sortedCompletedRecords.length > 0 ? "24px" : "0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <TrendingUp
                    className="w-4 h-4"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <h3
                    style={{
                      fontSize: "1rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    진행 중인 처방
                  </h3>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    ({sortedActiveRecords.length}건)
                  </span>
                </div>

                <div className="space-y-3">
                  {sortedActiveRecords.map((record) => {
                    const isExpanded = expandedRecords.has(record.id);
                    const daysSupply = record.daysSupply || 7;
                    const dates = getDateArray(
                      record.prescriptionDate,
                      daysSupply
                    );
                    const complianceRate = getComplianceRate(record);

                    return (
                      <div
                        key={record.id}
                        style={{
                          padding: "16px",
                          background: "var(--color-background)",
                          borderRadius: "12px",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <button
                          onClick={() => toggleRecord(record.id)}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            textAlign: "left",
                            gap: "16px",
                            padding: 0,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <p
                                style={{
                                  fontWeight: "700",
                                  fontSize: "1.0625rem",
                                }}
                              >
                                {record.hospitalName ||
                                  record.pharmacyName ||
                                  "병원/약국"}
                              </p>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "4px 10px",
                                  background:
                                    complianceRate >= 80
                                      ? "#D1FAE5"
                                      : complianceRate >= 50
                                        ? "#FEF3C7"
                                        : "#FEE2E2",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  color:
                                    complianceRate >= 80
                                      ? "#065F46"
                                      : complianceRate >= 50
                                        ? "#92400E"
                                        : "#991B1B",
                                }}
                              >
                                {complianceRate}%
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "0.875rem",
                                color: "var(--color-text-secondary)",
                                marginBottom: "4px",
                              }}
                            >
                              {formatDate(record.prescriptionDate)} ·{" "}
                              {daysSupply}일분
                            </p>
                            <p
                              style={{
                                fontSize: "0.875rem",
                                color: "var(--color-text-tertiary)",
                              }}
                            >
                              {record.medications.map((m) => m.name).join(", ")}
                            </p>
                          </div>
                        </button>

                        {isExpanded && (
                          <div
                            style={{
                              paddingTop: "16px",
                              marginTop: "16px",
                              borderTop: "1px solid var(--color-border)",
                            }}
                          >
                            {/* Medications Detail */}
                            <div style={{ marginBottom: "20px" }}>
                              <p
                                style={{
                                  fontSize: "0.875rem",
                                  color: "var(--color-text-secondary)",
                                  fontWeight: "600",
                                  marginBottom: "12px",
                                }}
                              >
                                처방 약물
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                {record.medications.map((med, medIdx) => (
                                  <div
                                    key={med.id}
                                    style={{
                                      padding: "12px",
                                      background: "white",
                                      borderRadius: "10px",
                                      border: "1px solid var(--color-border)",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        marginBottom: "6px",
                                      }}
                                    >
                                      <p
                                        style={{
                                          fontWeight: "700",
                                          fontSize: "0.9375rem",
                                          flex: 1,
                                        }}
                                      >
                                        {med.name}
                                      </p>
                                      <div style={{ display: "flex", gap: "4px" }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const name = prompt(
                                              "약 이름을 입력하세요",
                                              med.name
                                            );
                                            if (name === null) return;
                                            const dosage = prompt(
                                              "용량을 입력하세요 (예: 500mg)",
                                              med.dosage
                                            );
                                            if (dosage === null) return;
                                            const frequency = prompt(
                                              "복용 횟수를 입력하세요 (예: 1일 3회)",
                                              med.frequency
                                            );
                                            if (frequency === null) return;

                                            const updatedMedications = [
                                              ...record.medications,
                                            ];
                                            updatedMedications[medIdx] = {
                                              ...med,
                                              name: name || med.name,
                                              dosage: dosage || med.dosage,
                                              frequency:
                                                frequency || med.frequency,
                                            };
                                            handleUpdateRecord({
                                              ...record,
                                              medications: updatedMedications,
                                            });
                                          }}
                                          style={{
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "var(--color-primary)",
                                            fontSize: "0.8125rem",
                                            padding: "4px 8px",
                                            fontWeight: "600",
                                          }}
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              confirm(
                                                `${med.name}을(를) 삭제하시겠습니까?`
                                              )
                                            ) {
                                              const updatedMedications =
                                                record.medications.filter(
                                                  (_, i) => i !== medIdx
                                                );
                                              handleUpdateRecord({
                                                ...record,
                                                medications: updatedMedications,
                                              });
                                            }
                                          }}
                                          style={{
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#DC2626",
                                            fontSize: "0.8125rem",
                                            padding: "4px 8px",
                                            fontWeight: "600",
                                          }}
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "12px",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "0.8125rem",
                                          color: "var(--color-text-secondary)",
                                        }}
                                      >
                                        💊 {med.dosage}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: "0.8125rem",
                                          color: "var(--color-text-secondary)",
                                        }}
                                      >
                                        🕐 {med.frequency}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const name = prompt("약 이름을 입력하세요");
                                    if (!name) return;
                                    const dosage = prompt(
                                      "용량을 입력하세요 (예: 500mg)"
                                    );
                                    if (!dosage) return;
                                    const frequency = prompt(
                                      "복용 횟수를 입력하세요 (예: 1일 3회)"
                                    );
                                    if (!frequency) return;

                                    const newMed = {
                                      id: `med-${Date.now()}`,
                                      name,
                                      dosage,
                                      frequency,
                                      startDate: record.prescriptionDate,
                                      prescribedBy:
                                        record.hospitalName ||
                                        record.pharmacyName ||
                                        "병원",
                                    };
                                    handleUpdateRecord({
                                      ...record,
                                      medications: [
                                        ...record.medications,
                                        newMed,
                                      ],
                                    });
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "12px",
                                    background: "white",
                                    border: "2px dashed var(--color-border)",
                                    borderRadius: "10px",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                    color: "var(--color-primary)",
                                    fontWeight: "600",
                                  }}
                                >
                                  + 약 추가
                                </button>
                              </div>
                            </div>

                            {/* Alarm Times */}
                            <div style={{ marginBottom: "20px" }}>
                              <p
                                style={{
                                  fontSize: "0.875rem",
                                  color: "var(--color-text-secondary)",
                                  fontWeight: "600",
                                  marginBottom: "12px",
                                }}
                              >
                                복약 알람
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                {record.alarmTimes &&
                                record.alarmTimes.length > 0 ? (
                                  record.alarmTimes.map((time, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        padding: "12px 14px",
                                        background: "var(--color-primary-bg)",
                                        borderRadius: "10px",
                                        border: "1px solid var(--color-primary)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "0.9375rem",
                                          fontWeight: "600",
                                          color: "var(--color-primary)",
                                        }}
                                      >
                                        🔔 {time}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const updatedTimes =
                                            record.alarmTimes?.filter(
                                              (_, i) => i !== idx
                                            ) || [];
                                          handleUpdateRecord({
                                            ...record,
                                            alarmTimes:
                                              updatedTimes.length > 0
                                                ? updatedTimes
                                                : undefined,
                                          });
                                        }}
                                        style={{
                                          background: "transparent",
                                          border: "none",
                                          cursor: "pointer",
                                          color: "var(--color-text-tertiary)",
                                          fontSize: "0.875rem",
                                          padding: "4px 8px",
                                        }}
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <p
                                    style={{
                                      fontSize: "0.875rem",
                                      color: "var(--color-text-tertiary)",
                                      padding: "12px",
                                      textAlign: "center",
                                    }}
                                  >
                                    설정된 알람이 없습니다
                                  </p>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const time = prompt(
                                      "알람 시간을 입력하세요 (예: 09:00)"
                                    );
                                    if (
                                      time &&
                                      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(
                                        time
                                      )
                                    ) {
                                      const currentTimes =
                                        record.alarmTimes || [];
                                      handleUpdateRecord({
                                        ...record,
                                        alarmTimes: [...currentTimes, time],
                                      });
                                    } else if (time) {
                                      alert(
                                        "올바른 시간 형식을 입력해주세요 (예: 09:00)"
                                      );
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "12px",
                                    background: "white",
                                    border: "2px dashed var(--color-border)",
                                    borderRadius: "10px",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                    color: "var(--color-primary)",
                                    fontWeight: "600",
                                  }}
                                >
                                  + 알람 추가
                                </button>
                              </div>
                            </div>

                            <div>
                              <p
                                style={{
                                  fontSize: "0.875rem",
                                  color: "var(--color-text-secondary)",
                                  fontWeight: "600",
                                  marginBottom: "12px",
                                }}
                              >
                                복약 체크
                              </p>

                              {/* Daily Check Grid */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(7, 1fr)",
                                  gap: "8px",
                                }}
                              >
                                {dates.map((date, idx) => {
                                  const dateStr = date
                                    .toISOString()
                                    .split("T")[0];
                                  const isTaken =
                                    record.dailyLog?.[dateStr] === true;
                                  const isFuture = isDateInFuture(date);

                                  return (
                                    <button
                                      key={idx}
                                      onClick={() =>
                                        !isFuture &&
                                        handleDayToggle(record, dateStr)
                                      }
                                      disabled={isFuture}
                                      style={{
                                        aspectRatio: "1",
                                        minHeight: "56px",
                                        border: isTaken
                                          ? "2px solid var(--color-primary)"
                                          : "2px solid var(--color-border)",
                                        borderRadius: "12px",
                                        background: isTaken
                                          ? "var(--color-primary-bg)"
                                          : isFuture
                                            ? "#F9FAFB"
                                            : "white",
                                        cursor: isFuture
                                          ? "not-allowed"
                                          : "pointer",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "4px",
                                        opacity: isFuture ? 0.4 : 1,
                                        transition: "all 0.2s",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "0.6875rem",
                                          color: "var(--color-text-tertiary)",
                                          fontWeight: "600",
                                        }}
                                      >
                                        {formatDateShort(date)}
                                      </span>
                                      {isTaken ? (
                                        <CheckCircle
                                          className="w-5 h-5"
                                          style={{ color: "var(--color-primary)" }}
                                        />
                                      ) : (
                                        <Circle
                                          className="w-5 h-5"
                                          style={{ color: "var(--color-border)" }}
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Compliance Info */}
                              <div
                                style={{
                                  marginTop: "16px",
                                  padding: "14px",
                                  background: "white",
                                  borderRadius: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  border: "1px solid var(--color-border)",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "var(--color-text-secondary)",
                                  }}
                                >
                                  복약 순응도
                                </span>
                                <span
                                  style={{
                                    fontSize: "1.125rem",
                                    fontWeight: "700",
                                    color:
                                      complianceRate >= 80
                                        ? "var(--color-primary)"
                                        : complianceRate >= 50
                                          ? "#D97706"
                                          : "#DC2626",
                                  }}
                                >
                                  {complianceRate}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Records */}
            {sortedCompletedRecords.length > 0 && (
              <div>
                {sortedActiveRecords.length > 0 && (
                  <div
                    style={{
                      height: "1px",
                      background: "var(--color-border)",
                      marginBottom: "20px",
                    }}
                  />
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <CheckCircle
                    className="w-4 h-4"
                    style={{ color: "var(--color-text-tertiary)" }}
                  />
                  <h3
                    style={{
                      fontSize: "1rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    완료된 처방
                  </h3>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    ({sortedCompletedRecords.length}건)
                  </span>
                </div>

                <div className="space-y-3">
                  {sortedCompletedRecords.map((record) => {
                    const isExpanded = expandedRecords.has(record.id);
                    const daysSupply = record.daysSupply || 7;
                    const dates = getDateArray(
                      record.prescriptionDate,
                      daysSupply
                    );
                    const complianceRate = getComplianceRate(record);

                    return (
                      <div
                        key={record.id}
                        style={{
                          padding: "16px",
                          background: "var(--color-background)",
                          borderRadius: "12px",
                          border: "1px solid var(--color-border)",
                          opacity: 0.75,
                        }}
                      >
                        <button
                          onClick={() => toggleRecord(record.id)}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            textAlign: "left",
                            gap: "16px",
                            padding: 0,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <p
                                style={{
                                  fontWeight: "700",
                                  fontSize: "1.0625rem",
                                }}
                              >
                                {record.hospitalName ||
                                  record.pharmacyName ||
                                  "병원/약국"}
                              </p>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "4px 10px",
                                  background: "#F3F4F6",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  color: "#6B7280",
                                }}
                              >
                                완료 {complianceRate}%
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "0.875rem",
                                color: "var(--color-text-secondary)",
                                marginBottom: "4px",
                              }}
                            >
                              {formatDate(record.prescriptionDate)} ·{" "}
                              {daysSupply}일분
                            </p>
                          </div>
                        </button>

                        {isExpanded && (
                          <div
                            style={{
                              paddingTop: "16px",
                              marginTop: "16px",
                              borderTop: "1px solid var(--color-border)",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontSize: "0.875rem",
                                  color: "var(--color-text-secondary)",
                                  fontWeight: "600",
                                  marginBottom: "12px",
                                }}
                              >
                                복약 기록
                              </p>

                              {/* Daily Check Grid (Read Only) */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(7, 1fr)",
                                  gap: "8px",
                                }}
                              >
                                {dates.map((date, idx) => {
                                  const dateStr = date
                                    .toISOString()
                                    .split("T")[0];
                                  const isTaken =
                                    record.dailyLog?.[dateStr] === true;

                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        aspectRatio: "1",
                                        minHeight: "56px",
                                        border: isTaken
                                          ? "2px solid #9CA3AF"
                                          : "2px solid #E5E7EB",
                                        borderRadius: "12px",
                                        background: isTaken ? "#F3F4F6" : "white",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "0.6875rem",
                                          color: "var(--color-text-tertiary)",
                                          fontWeight: "600",
                                        }}
                                      >
                                        {formatDateShort(date)}
                                      </span>
                                      {isTaken ? (
                                        <CheckCircle
                                          className="w-5 h-5"
                                          style={{ color: "#9CA3AF" }}
                                        />
                                      ) : (
                                        <Circle
                                          className="w-5 h-5"
                                          style={{ color: "#E5E7EB" }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Final Compliance */}
                              <div
                                style={{
                                  marginTop: "16px",
                                  padding: "14px",
                                  background: "white",
                                  borderRadius: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  border: "1px solid var(--color-border)",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "var(--color-text-secondary)",
                                  }}
                                >
                                  최종 복약 순응도
                                </span>
                                <span
                                  style={{
                                    fontSize: "1.125rem",
                                    fontWeight: "700",
                                    color: "#6B7280",
                                  }}
                                >
                                  {complianceRate}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Records List */}
        {records.length === 0 && (
          <div
            className="card"
            style={{
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 20px",
                background: "var(--color-background)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar
                className="w-8 h-8"
                style={{ color: "var(--color-text-tertiary)" }}
              />
            </div>
            <h3 style={{ marginBottom: "8px" }}>처방 기록이 없습니다</h3>
            <p
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "0.9375rem",
              }}
            >
              조제내역서를 촬영하여<br />
              첫 기록을 추가해보세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

