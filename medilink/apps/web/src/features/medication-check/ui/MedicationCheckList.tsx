"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Circle, Clock } from "lucide-react";
import {
  getMedicationChecks,
  updateMedicationCheck,
  type MedicationCheck,
} from "@/shared/api";

export type MedicationCheckListProps = {
  recordId: string;
  onCheckUpdate?: () => void;
};

type GroupedChecks = {
  [date: string]: MedicationCheck[];
};

export function MedicationCheckList({ recordId, onCheckUpdate }: MedicationCheckListProps) {
  const [checks, setChecks] = useState<MedicationCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadChecks();
  }, [recordId]);

  const loadChecks = async () => {
    try {
      const data = await getMedicationChecks(recordId);
      setChecks(data.checks);
    } catch (error) {
      console.error("Failed to load medication checks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCheck = async (check: MedicationCheck) => {
    // 미래 날짜는 체크 불가
    const scheduledDate = new Date(check.scheduledAt);
    const now = new Date();
    if (scheduledDate > now) {
      return;
    }

    // 이미 업데이트 중이면 무시
    if (updating.has(check.id)) {
      return;
    }

    // Optimistic update
    setUpdating((prev) => new Set(prev).add(check.id));
    setChecks((prev) =>
      prev.map((c) =>
        c.id === check.id
          ? { ...c, isTaken: !c.isTaken, takenAt: !c.isTaken ? new Date().toISOString() : null }
          : c
      )
    );

    try {
      await updateMedicationCheck(check.id, !check.isTaken);
      onCheckUpdate?.();
    } catch (error) {
      console.error("Failed to update check:", error);
      // Revert on error
      setChecks((prev) =>
        prev.map((c) => (c.id === check.id ? check : c))
      );
    } finally {
      setUpdating((prev) => {
        const newSet = new Set(prev);
        newSet.delete(check.id);
        return newSet;
      });
    }
  };

  // 날짜별로 체크 그룹핑
  const groupedChecks: GroupedChecks = checks.reduce((acc, check) => {
    const date = new Date(check.scheduledAt).toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(check);
    return acc;
  }, {} as GroupedChecks);

  // 날짜 정렬
  const sortedDates = Object.keys(groupedChecks).sort();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    return `${month}월 ${day}일 (${dayOfWeek})`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const isDateInFuture = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const isTimeInFuture = (dateStr: string) => {
    return new Date(dateStr) > new Date();
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div
        style={{
          padding: "32px 24px",
          textAlign: "center",
          background: "#F9FAFB",
          borderRadius: "12px",
        }}
      >
        <Clock style={{ width: "48px", height: "48px", color: "#9CA3AF", margin: "0 auto 12px" }} />
        <p style={{ fontSize: "0.875rem", color: "#6B7280" }}>
          복약 체크 기록이 없습니다
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {sortedDates.map((date) => {
        const dateChecks = groupedChecks[date];
        const isFutureDate = isDateInFuture(date);
        const takenCount = dateChecks.filter((c) => c.isTaken).length;
        const totalCount = dateChecks.length;
        const completionRate = Math.round((takenCount / totalCount) * 100);

        return (
          <div
            key={date}
            style={{
              background: "white",
              borderRadius: "16px",
              border: "2px solid #E5E7EB",
              overflow: "hidden",
            }}
          >
            {/* Date Header */}
            <div
              style={{
                padding: "14px 16px",
                background: isFutureDate
                  ? "#F9FAFB"
                  : completionRate === 100
                  ? "#ECFDF5"
                  : completionRate >= 50
                  ? "#FEF3C7"
                  : "#FEE2E2",
                borderBottom: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <p
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: "700",
                  color: isFutureDate ? "#6B7280" : "#111827",
                }}
              >
                {formatDate(date)}
              </p>
              {!isFutureDate && (
                <span
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: "700",
                    color:
                      completionRate === 100
                        ? "#065F46"
                        : completionRate >= 50
                        ? "#92400E"
                        : "#991B1B",
                  }}
                >
                  {takenCount}/{totalCount}회
                </span>
              )}
            </div>

            {/* Checks List */}
            <div style={{ padding: "12px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "10px",
                }}
              >
                {dateChecks
                  .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                  .map((check) => {
                    const isFuture = isTimeInFuture(check.scheduledAt);
                    const isUpdating = updating.has(check.id);

                    return (
                      <button
                        key={check.id}
                        onClick={() => !isFuture && handleToggleCheck(check)}
                        disabled={isFuture || isUpdating}
                        style={{
                          padding: "12px 8px",
                          borderRadius: "12px",
                          border: check.isTaken
                            ? "2px solid #10B981"
                            : "2px solid #E5E7EB",
                          background: check.isTaken
                            ? "#ECFDF5"
                            : isFuture
                            ? "#F9FAFB"
                            : "white",
                          cursor: isFuture ? "not-allowed" : "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          opacity: isFuture ? 0.5 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8125rem",
                            fontWeight: "600",
                            color: check.isTaken ? "#065F46" : "#6B7280",
                          }}
                        >
                          {formatTime(check.scheduledAt)}
                        </span>
                        {check.isTaken ? (
                          <CheckCircle
                            className="w-6 h-6"
                            style={{ color: "#10B981" }}
                          />
                        ) : (
                          <Circle
                            className="w-6 h-6"
                            style={{ color: "#D1D5DB" }}
                          />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
