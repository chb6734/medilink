"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getAdherence, type AdherenceResponse } from "@/shared/api";
import { TrendingUp, Calendar, Award, AlertCircle } from "lucide-react";

export type AdherenceChartProps = {
  recordId: string;
  refreshKey?: number; // 이 값이 변경되면 데이터를 다시 가져옴
};

export function AdherenceChart({ recordId, refreshKey = 0 }: AdherenceChartProps) {
  const [loading, setLoading] = useState(true);
  const [adherenceData, setAdherenceData] = useState<AdherenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // refreshKey가 변경되어도 로딩 상태는 기존 데이터가 있으면 표시하지 않음 (깜빡임 방지)
        if (!adherenceData) {
          setLoading(true);
        }
        const data = await getAdherence(recordId);
        if (!cancelled) {
          setAdherenceData(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch adherence data:", err);
          setError("순응도 데이터를 불러올 수 없습니다.");
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
  }, [recordId, refreshKey]);

  if (loading) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p style={{ color: "var(--color-text-secondary)" }}>순응도 데이터 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <AlertCircle style={{ width: "48px", height: "48px", color: "#EF4444", margin: "0 auto 16px" }} />
        <p style={{ color: "#EF4444", fontWeight: "600" }}>{error}</p>
      </div>
    );
  }

  if (!adherenceData || adherenceData.overall === null) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <Calendar style={{ width: "64px", height: "64px", color: "#9CA3AF", margin: "0 auto 16px" }} />
        <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--color-text)", marginBottom: "8px" }}>
          복약 기록이 없습니다
        </h3>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
          {adherenceData?.message || "복약 체크를 시작하면 순응도가 표시됩니다."}
        </p>
      </div>
    );
  }

  // 차트 데이터 준비
  const chartData = Object.entries(adherenceData.dailyAdherence)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, adherence]) => ({
      date: new Date(date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      adherence,
      fullDate: date,
    }));

  return (
    <div style={{ padding: "24px" }}>
      {/* 전체 순응도 카드 */}
      <div
        style={{
          background: adherenceData.grade?.color || "#3B82F6",
          borderRadius: "20px",
          padding: "28px",
          color: "white",
          marginBottom: "24px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <Award style={{ width: "32px", height: "32px" }} />
          <div>
            <p style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "4px" }}>전체 복약 순응도</p>
            <h2 style={{ fontSize: "2.5rem", fontWeight: "800", lineHeight: 1 }}>
              {adherenceData.overall?.toFixed(1)}%
            </h2>
          </div>
        </div>
        {adherenceData.grade && (
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginTop: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.125rem", fontWeight: "700" }}>{adherenceData.grade.label}</span>
              <span style={{ fontSize: "0.9375rem", opacity: 0.95 }}>{adherenceData.grade.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* 기간별 순응도 */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "24px",
          border: "2px solid #E5E7EB",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <TrendingUp style={{ width: "20px", height: "20px", color: "var(--color-accent)" }} />
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--color-text)" }}>기간별 순응도</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <div style={{ textAlign: "center", padding: "12px", background: "#F9FAFB", borderRadius: "12px" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>최근 7일</p>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--color-accent)" }}>
              {adherenceData.last7Days !== null ? `${adherenceData.last7Days.toFixed(1)}%` : "-"}
            </p>
          </div>
          <div style={{ textAlign: "center", padding: "12px", background: "#F9FAFB", borderRadius: "12px" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>최근 14일</p>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--color-accent)" }}>
              {adherenceData.last14Days !== null ? `${adherenceData.last14Days.toFixed(1)}%` : "-"}
            </p>
          </div>
          <div style={{ textAlign: "center", padding: "12px", background: "#F9FAFB", borderRadius: "12px" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>최근 30일</p>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--color-accent)" }}>
              {adherenceData.last30Days !== null ? `${adherenceData.last30Days.toFixed(1)}%` : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* 일별 순응도 차트 */}
      {chartData.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "20px",
            border: "2px solid #E5E7EB",
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "700",
              color: "var(--color-text)",
              marginBottom: "20px",
            }}
          >
            일별 순응도 추이
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                stroke="#9CA3AF"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "#6B7280" }}
                stroke="#9CA3AF"
                label={{ value: "%", position: "insideLeft", style: { fontSize: 12, fill: "#6B7280" } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #E5E7EB",
                  borderRadius: "12px",
                  padding: "8px 12px",
                }}
                labelStyle={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}
                itemStyle={{ color: "#3B82F6", fontWeight: "600" }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, "순응도"]}
              />
              <Legend
                wrapperStyle={{ fontSize: "14px", paddingTop: "16px" }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="adherence"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: "#3B82F6", r: 5 }}
                activeDot={{ r: 7 }}
                name="복약 순응도"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
