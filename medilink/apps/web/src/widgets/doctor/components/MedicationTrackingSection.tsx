import { Calendar, CheckCircle, XCircle } from "lucide-react";
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
import type { MedicationTrackingDay } from "../lib/types";
import {
  COLORS,
  DAYS_IN_WEEK,
  SYMPTOM_INDICATOR_WIDTH_MULTIPLIER,
  SYMPTOM_LEVEL_MAX,
} from "../lib/constants";
import {
  getMedicationStatusStyles,
  getMedicationRowStyles,
  getMedicationStatusText,
  getSymptomLevelColor,
  getStatusTextColor,
} from "../lib/medicationUtils";

interface MedicationTrackingSectionProps {
  medicationTracking: MedicationTrackingDay[];
}

function TrackingDayCell({ day }: { day: MedicationTrackingDay }) {
  const styles = getMedicationStatusStyles(day);

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "0.6875rem",
          color: COLORS.textLight,
          marginBottom: "6px",
          fontWeight: "600",
        }}
      >
        {day.dayOfWeek}
      </div>
      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          borderRadius: "10px",
          background: styles.background,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "6px",
          boxShadow: styles.boxShadow,
          position: "relative",
        }}
      >
        {day.isFullyTaken ? (
          <CheckCircle className="w-5 h-5" style={{ color: "white" }} />
        ) : day.isPartiallyTaken ? (
          <span
            style={{ color: "white", fontSize: "0.75rem", fontWeight: "700" }}
          >
            {day.takenCount}/{day.totalCount}
          </span>
        ) : (
          <XCircle className="w-5 h-5" style={{ color: "#CBD5E1" }} />
        )}
        <div
          style={{
            position: "absolute",
            bottom: "-4px",
            left: "50%",
            transform: "translateX(-50%)",
            width: `${day.symptomLevel * SYMPTOM_INDICATOR_WIDTH_MULTIPLIER}px`,
            height: "4px",
            borderRadius: "2px",
            background: getSymptomLevelColor(day.symptomLevel),
          }}
        />
      </div>
      <div
        style={{
          fontSize: "0.6875rem",
          color: COLORS.textMuted,
          fontWeight: "600",
        }}
      >
        {day.dateStr.split(" ")[1]}
      </div>
    </div>
  );
}

function TrackingHistoryRow({ day }: { day: MedicationTrackingDay }) {
  const rowStyles = getMedicationRowStyles(day);
  const statusColor = getStatusTextColor(day);

  return (
    <div
      style={{
        padding: "14px 16px",
        background: rowStyles.background,
        borderRadius: "10px",
        border: rowStyles.border,
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: getMedicationStatusStyles(day).background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {day.isFullyTaken ? (
          <CheckCircle className="w-4 h-4" style={{ color: "white" }} />
        ) : day.isPartiallyTaken ? (
          <span
            style={{ color: "white", fontSize: "0.625rem", fontWeight: "700" }}
          >
            {day.takenCount}/{day.totalCount}
          </span>
        ) : (
          <XCircle className="w-4 h-4" style={{ color: "white" }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: COLORS.textPrimary,
            }}
          >
            {day.dateStr}
          </span>
          <span style={{ fontSize: "0.75rem", color: COLORS.textMuted }}>
            ({day.dayOfWeek})
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: statusColor,
              fontWeight: "600",
            }}
          >
            {getMedicationStatusText(day)}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: COLORS.textMuted }}>
              증상
            </span>
            <div style={{ display: "flex", gap: "2px" }}>
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background:
                      level <= day.symptomLevel
                        ? getSymptomLevelColor(day.symptomLevel)
                        : COLORS.border,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {day.notes && (
          <p
            style={{
              fontSize: "0.75rem",
              color: COLORS.textSecondary,
              marginTop: "6px",
              marginBottom: 0,
              fontStyle: "italic",
            }}
          >
            "{day.notes}"
          </p>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div
      style={{
        marginTop: "20px",
        padding: "16px",
        background: COLORS.background,
        borderRadius: "10px",
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: "600",
          color: COLORS.textSecondary,
          marginBottom: "10px",
        }}
      >
        복약 상태
      </div>
      <div
        style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}
      >
        <LegendItem color={COLORS.success} label="전체 복용" />
        <LegendItem color={COLORS.warning} label="일부 복용" />
        <LegendItem color={COLORS.danger} label="복용 누락" />
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: "600",
          color: COLORS.textSecondary,
          marginBottom: "10px",
        }}
      >
        증상 수준
      </div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <LegendItem color={COLORS.success} label="양호 (1-2)" />
        <LegendItem color={COLORS.warning} label="보통 (3)" />
        <LegendItem color={COLORS.danger} label="주의 (4-5)" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "3px",
          background: color,
        }}
      />
      <span style={{ fontSize: "0.6875rem", color: COLORS.textMuted }}>
        {label}
      </span>
    </div>
  );
}

function StatisticsCharts({
  data,
}: {
  data: MedicationTrackingDay[];
}) {
  return (
    <div
      style={{
        marginTop: "32px",
        paddingTop: "32px",
        borderTop: `2px solid ${COLORS.border}`,
      }}
    >
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: "700",
          color: COLORS.textPrimary,
          marginBottom: "24px",
        }}
      >
        통계 분석
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "24px",
        }}
      >
        {/* Symptom Trend Chart */}
        <div
          style={{
            background: COLORS.background,
            padding: "20px",
            borderRadius: "12px",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h4
            style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: COLORS.textSecondary,
              marginBottom: "16px",
            }}
          >
            증상 추이 (최근 14일)
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis
                dataKey="dateStr"
                tick={{ fontSize: 11, fill: COLORS.textMuted }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, SYMPTOM_LEVEL_MAX]}
                tick={{ fontSize: 11, fill: COLORS.textMuted }}
                label={{
                  value: "증상 수준",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: COLORS.textMuted },
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                }}
              />
              <Line
                type="monotone"
                dataKey="symptomLevel"
                stroke={COLORS.danger}
                strokeWidth={3}
                dot={{ fill: COLORS.danger, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="증상 수준"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Adherence Chart */}
        <div
          style={{
            background: COLORS.background,
            padding: "20px",
            borderRadius: "12px",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h4
            style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: COLORS.textSecondary,
              marginBottom: "16px",
            }}
          >
            복약 순응도 (최근 14일)
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis
                dataKey="dateStr"
                tick={{ fontSize: 11, fill: COLORS.textMuted }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fontSize: 11, fill: COLORS.textMuted }}
                ticks={[0, 1]}
                tickFormatter={(value) => (value === 1 ? "복용" : "누락")}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                }}
                formatter={(value: number) => [
                  value === 1 ? "복용 완료" : "복용 누락",
                  "상태",
                ]}
              />
              <Bar
                dataKey={(item: MedicationTrackingDay) => (item.taken ? 1 : 0)}
                fill={COLORS.success}
                radius={[8, 8, 0, 0]}
                name="복약 상태"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function MedicationTrackingSection({
  medicationTracking,
}: MedicationTrackingSectionProps) {
  const isEmpty = medicationTracking.length === 0;

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
        <Calendar className="w-5 h-5" style={{ color: COLORS.primary }} />
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "700",
            color: COLORS.textPrimary,
            marginBottom: 0,
          }}
        >
          복약 기록 & 상태 변화
        </h2>
      </div>

      {isEmpty ? (
        <div
          style={{
            padding: "40px 16px",
            textAlign: "center",
            color: COLORS.textMuted,
            fontSize: "0.875rem",
          }}
        >
          <Calendar
            className="w-12 h-12"
            style={{ color: "#CBD5E1", margin: "0 auto 12px" }}
          />
          <p style={{ marginBottom: 0 }}>
            아직 복약 기록이 없습니다.
            <br />
            환자가 복약 기록을 입력하면 이곳에 표시됩니다.
          </p>
        </div>
      ) : (
        <>
          {/* Weekly Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${DAYS_IN_WEEK}, 1fr)`,
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            {medicationTracking.slice(-DAYS_IN_WEEK).map((day, idx) => (
              <TrackingDayCell key={idx} day={day} />
            ))}
          </div>

          {/* History List */}
          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              paddingRight: "8px",
            }}
          >
            <div className="space-y-2">
              {medicationTracking
                .slice()
                .reverse()
                .map((day, idx) => (
                  <TrackingHistoryRow key={idx} day={day} />
                ))}
            </div>
          </div>

          <Legend />
          <StatisticsCharts data={medicationTracking} />
        </>
      )}
    </div>
  );
}
