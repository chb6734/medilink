/**
 * 복약 순응도 (Medication Adherence) 계산 로직
 *
 * @description
 * 환자의 복약 체크 데이터를 기반으로 복약 순응도를 계산합니다.
 * 순응도 = (실제 복약 횟수 / 예정 복약 횟수) × 100
 *
 * @example
 * const adherence = calculateAdherence([
 *   { scheduledAt: new Date('2026-01-01T09:00'), isTaken: true },
 *   { scheduledAt: new Date('2026-01-01T12:00'), isTaken: true },
 *   { scheduledAt: new Date('2026-01-01T18:00'), isTaken: false },
 *   { scheduledAt: new Date('2026-01-02T09:00'), isTaken: true },
 * ]);
 * // adherence = 75% (3 taken out of 4 scheduled)
 */

export interface MedicationCheckData {
  scheduledAt: Date;
  isTaken: boolean;
  takenAt?: Date | null;
}

/**
 * 복약 순응도 계산
 *
 * @param checks - 복약 체크 기록 배열
 * @param untilNow - true일 경우 현재 시간까지의 체크만 계산 (기본값: true)
 * @returns 순응도 퍼센트 (0-100), 기록이 없으면 null
 */
export function calculateAdherence(
  checks: MedicationCheckData[],
  untilNow: boolean = true,
): number | null {
  const nowTime = Date.now();

  // 현재 시간까지의 체크만 필터링 (옵션에 따라)
  // scheduledAt이 문자열일 수 있으므로 명시적으로 Date로 변환하여 비교
  const filteredChecks = untilNow
    ? checks.filter((c) => new Date(c.scheduledAt).getTime() <= nowTime)
    : checks;

  if (filteredChecks.length === 0) {
    return null; // 기록이 없으면 계산 불가
  }

  const totalScheduled = filteredChecks.length;
  const totalTaken = filteredChecks.filter((c) => c.isTaken).length;

  const adherencePercent = (totalTaken / totalScheduled) * 100;

  // 소수점 첫째 자리까지 반올림
  return Math.round(adherencePercent * 10) / 10;
}

/**
 * 기간별 복약 순응도 계산
 *
 * @param checks - 복약 체크 기록 배열
 * @param days - 최근 며칠간의 데이터를 사용할지 (기본값: 7일)
 * @returns 순응도 퍼센트 (0-100), 기록이 없으면 null
 */
export function calculateAdherenceByPeriod(
  checks: MedicationCheckData[],
  days: number = 7,
): number | null {
  const nowTime = Date.now();
  const cutoffTime = nowTime - days * 24 * 60 * 60 * 1000;

  // 최근 N일간 + 현재 시간까지의 기록만 필터링
  const recentChecks = checks.filter((c) => {
    const scheduledTime = new Date(c.scheduledAt).getTime();
    return scheduledTime >= cutoffTime && scheduledTime <= nowTime;
  });

  // 이미 필터링된 데이터이므로 untilNow=false로 호출
  return calculateAdherence(recentChecks, false);
}

/**
 * 복약 순응도 등급 반환
 *
 * @param adherencePercent - 순응도 퍼센트
 * @returns 순응도 등급 및 설명
 */
export function getAdherenceGrade(adherencePercent: number): {
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  label: string;
  description: string;
  color: string;
} {
  if (adherencePercent >= 90) {
    return {
      grade: 'excellent',
      label: '우수',
      description: '매우 잘 지키고 계십니다!',
      color: '#10B981', // green
    };
  } else if (adherencePercent >= 70) {
    return {
      grade: 'good',
      label: '양호',
      description: '잘 지키고 계십니다.',
      color: '#3B82F6', // blue
    };
  } else if (adherencePercent >= 50) {
    return {
      grade: 'fair',
      label: '보통',
      description: '조금 더 노력이 필요합니다.',
      color: '#F59E0B', // amber
    };
  } else {
    return {
      grade: 'poor',
      label: '부족',
      description: '복약 관리가 필요합니다.',
      color: '#EF4444', // red
    };
  }
}

/**
 * 일별 복약 순응도 계산
 *
 * @param checks - 복약 체크 기록 배열
 * @param untilNow - true일 경우 현재 시간까지의 체크만 계산 (기본값: true)
 * @returns 날짜별 순응도 맵 (YYYY-MM-DD → 퍼센트)
 */
export function calculateDailyAdherence(
  checks: MedicationCheckData[],
  untilNow: boolean = true,
): Map<string, number> {
  const nowTime = Date.now();

  // 현재 시간까지의 체크만 필터링 (옵션에 따라)
  // scheduledAt이 문자열일 수 있으므로 명시적으로 Date로 변환하여 비교
  const filteredChecks = untilNow
    ? checks.filter((c) => new Date(c.scheduledAt).getTime() <= nowTime)
    : checks;

  const dailyMap = new Map<
    string,
    { scheduled: number; taken: number }
  >();

  for (const check of filteredChecks) {
    const dateKey = new Date(check.scheduledAt).toISOString().slice(0, 10);

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, { scheduled: 0, taken: 0 });
    }

    const dailyData = dailyMap.get(dateKey)!;
    dailyData.scheduled++;
    if (check.isTaken) {
      dailyData.taken++;
    }
  }

  const result = new Map<string, number>();
  dailyMap.forEach((data, dateKey) => {
    const adherence = (data.taken / data.scheduled) * 100;
    result.set(dateKey, Math.round(adherence * 10) / 10);
  });

  return result;
}
