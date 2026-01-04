import type { MedicationHistoryItem, MedicationTrackingDay } from "./types";
import {
  COLORS,
  GRADIENTS,
  STATUS_BACKGROUNDS,
  SYMPTOM_LEVEL_GOOD_MAX,
  SYMPTOM_LEVEL_MODERATE_MAX,
} from "./constants";

/**
 * Convert medication history items to tracking format with computed properties
 */
export function convertToTrackingFormat(
  medicationHistory: MedicationHistoryItem[],
  today: Date
): MedicationTrackingDay[] {
  return medicationHistory
    .filter((item) => new Date(item.date) <= today)
    .map((item) => {
      const date = new Date(item.date);
      const takenCount = item.takenCount ?? (item.taken ? 1 : 0);
      const totalCount = item.totalCount ?? 1;
      const isFullyTaken = takenCount >= totalCount;
      const isPartiallyTaken = takenCount > 0 && takenCount < totalCount;

      return {
        date,
        dateStr: date.toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        }),
        dayOfWeek: date.toLocaleDateString("ko-KR", { weekday: "short" }),
        taken: item.taken,
        takenCount,
        totalCount,
        isFullyTaken,
        isPartiallyTaken,
        symptomLevel: item.symptomLevel,
        notes: item.notes,
      };
    });
}

/**
 * Calculate adherence rate from medication tracking data
 */
export function calculateAdherenceRate(
  tracking: MedicationTrackingDay[]
): number {
  const totalDoses = tracking.reduce((sum, d) => sum + d.totalCount, 0);
  const takenDoses = tracking.reduce((sum, d) => sum + d.takenCount, 0);
  return totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;
}

/**
 * Get medication status display text
 */
export function getMedicationStatusText(day: MedicationTrackingDay): string {
  if (day.isFullyTaken) return "복용 완료";
  if (day.isPartiallyTaken)
    return `일부 복용 (${day.takenCount}/${day.totalCount}회)`;
  return "복용 누락";
}

/**
 * Get medication status styles based on tracking day
 */
export function getMedicationStatusStyles(day: MedicationTrackingDay): {
  background: string;
  boxShadow: string;
} {
  if (day.isFullyTaken) {
    return {
      background: GRADIENTS.success,
      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
    };
  }
  if (day.isPartiallyTaken) {
    return {
      background: GRADIENTS.warning,
      boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
    };
  }
  return {
    background: "#F1F5F9",
    boxShadow: "none",
  };
}

/**
 * Get medication row styles
 */
export function getMedicationRowStyles(day: MedicationTrackingDay): {
  background: string;
  border: string;
} {
  if (day.isFullyTaken) {
    return {
      background: STATUS_BACKGROUNDS.success,
      border: `1px solid ${STATUS_BACKGROUNDS.successBorder}`,
    };
  }
  if (day.isPartiallyTaken) {
    return {
      background: STATUS_BACKGROUNDS.warning,
      border: `1px solid ${STATUS_BACKGROUNDS.warningBorder}`,
    };
  }
  return {
    background: STATUS_BACKGROUNDS.danger,
    border: `1px solid ${STATUS_BACKGROUNDS.dangerBorder}`,
  };
}

/**
 * Get symptom level color
 */
export function getSymptomLevelColor(level: number): string {
  if (level <= SYMPTOM_LEVEL_GOOD_MAX) return COLORS.success;
  if (level <= SYMPTOM_LEVEL_MODERATE_MAX) return COLORS.warning;
  return COLORS.danger;
}

/**
 * Get status text color
 */
export function getStatusTextColor(day: MedicationTrackingDay): string {
  if (day.isFullyTaken) return COLORS.successDark;
  if (day.isPartiallyTaken) return COLORS.warningDark;
  return COLORS.dangerDark;
}
