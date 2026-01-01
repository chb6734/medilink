/**
 * 복약 알람 시간별 약 분류 로직
 *
 * @description
 * 처방된 약물들의 복용 빈도를 분석하여 시간대별로 어떤 약을 먹어야 하는지 자동으로 분류합니다.
 *
 * @example
 * 입력:
 * - 펠루비정: 1일 3회 (아침, 점심, 저녁)
 * - 브로피딘정: 1일 2회 (아침, 저녁)
 * - 테세놀: 1일 3회 (아침, 점심, 저녁)
 *
 * 출력:
 * - 09:00 → 펠루비정, 브로피딘정, 테세놀
 * - 12:00 → 펠루비정, 테세놀
 * - 18:00 → 펠루비정, 브로피딘정, 테세놀
 */

export interface MedicationItem {
  id: string;
  nameRaw: string;
  dose: string | null;
  frequency: string | null; // "1일 3회", "1일 2회", "하루 3번" 등
  durationDays: number | null;
}

export interface MedicationSchedule {
  time: string; // "09:00", "12:00", "18:00" 형식
  medications: {
    medItemId: string;
    medName: string;
    dose: string | null;
  }[];
}

/**
 * 복용 빈도 문자열을 파싱하여 1일 복용 횟수 추출
 *
 * @param frequency - "1일 3회", "하루 2번", "1일3회" 등
 * @returns 1일 복용 횟수 (파싱 실패 시 null)
 */
export function parseFrequency(frequency: string | null): number | null {
  if (!frequency) return null;

  const normalized = frequency.trim().toLowerCase();

  // "1일 3회", "1일3회" 패턴
  const pattern1 = /(\d+)\s*일\s*(\d+)\s*회/;
  const match1 = normalized.match(pattern1);
  if (match1) {
    return parseInt(match1[2], 10);
  }

  // "하루 3번", "하루3번" 패턴
  const pattern2 = /하루\s*(\d+)\s*번/;
  const match2 = normalized.match(pattern2);
  if (match2) {
    return parseInt(match2[1], 10);
  }

  // "하루 3회", "하루3회" 패턴
  const pattern3 = /하루\s*(\d+)\s*회/;
  const match3 = normalized.match(pattern3);
  if (match3) {
    return parseInt(match3[1], 10);
  }

  // "3회/일" 패턴
  const pattern4 = /(\d+)\s*회\s*\/\s*일/;
  const match4 = normalized.match(pattern4);
  if (match4) {
    return parseInt(match4[1], 10);
  }

  return null;
}

/**
 * 복용 횟수에 따른 기본 시간대 반환
 *
 * @param timesPerDay - 1일 복용 횟수
 * @returns 복용 시간대 배열 (24시간 형식, 예: ["09:00", "12:00", "18:00"])
 */
export function getDefaultTimesForFrequency(timesPerDay: number): string[] {
  switch (timesPerDay) {
    case 1:
      return ['09:00']; // 1일 1회: 아침
    case 2:
      return ['09:00', '18:00']; // 1일 2회: 아침, 저녁
    case 3:
      return ['09:00', '12:00', '18:00']; // 1일 3회: 아침, 점심, 저녁
    case 4:
      return ['08:00', '12:00', '17:00', '21:00']; // 1일 4회: 아침, 점심, 저녁, 취침 전
    default:
      // 1일 5회 이상은 균등 분배 (6시간 간격)
      const interval = Math.floor(24 / timesPerDay);
      const times: string[] = [];
      for (let i = 0; i < timesPerDay; i++) {
        const hour = (8 + i * interval) % 24;
        times.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      return times;
  }
}

/**
 * 약물 리스트를 시간대별로 분류
 *
 * @param medications - 약물 항목 리스트
 * @returns 시간대별 약물 스케줄
 */
export function generateMedicationSchedule(
  medications: MedicationItem[],
): MedicationSchedule[] {
  // 1. 각 약의 복용 시간대 추출
  const medicationTimes: Map<
    string,
    { medItem: MedicationItem; times: string[] }
  > = new Map();

  for (const med of medications) {
    const timesPerDay = parseFrequency(med.frequency);
    if (!timesPerDay) {
      // 빈도 파싱 실패 시 기본값 (1일 1회)
      medicationTimes.set(med.id, {
        medItem: med,
        times: ['09:00'],
      });
      continue;
    }

    const times = getDefaultTimesForFrequency(timesPerDay);
    medicationTimes.set(med.id, { medItem: med, times });
  }

  // 2. 모든 고유한 복용 시간대 추출
  const allTimes = new Set<string>();
  medicationTimes.forEach(({ times }) => {
    times.forEach((time) => allTimes.add(time));
  });

  // 3. 시간대별로 약 분류
  const schedules: MedicationSchedule[] = [];
  const sortedTimes = Array.from(allTimes).sort();

  for (const time of sortedTimes) {
    const medsAtThisTime: MedicationSchedule['medications'] = [];

    medicationTimes.forEach(({ medItem, times }) => {
      if (times.includes(time)) {
        medsAtThisTime.push({
          medItemId: medItem.id,
          medName: medItem.nameRaw,
          dose: medItem.dose,
        });
      }
    });

    if (medsAtThisTime.length > 0) {
      schedules.push({
        time,
        medications: medsAtThisTime,
      });
    }
  }

  return schedules;
}

/**
 * 예시 사용법
 *
 * const medications: MedicationItem[] = [
 *   { id: '1', nameRaw: '펠루비정', dose: '1정', frequency: '1일 3회', durationDays: 3 },
 *   { id: '2', nameRaw: '브로피딘정', dose: '1정', frequency: '1일 2회', durationDays: 3 },
 *   { id: '3', nameRaw: '테세놀8시간이알서방정', dose: '1정', frequency: '1일 3회', durationDays: 3 },
 * ];
 *
 * const schedule = generateMedicationSchedule(medications);
 * console.log(schedule);
 * // [
 * //   {
 * //     time: "09:00",
 * //     medications: [
 * //       { medItemId: "1", medName: "펠루비정", dose: "1정" },
 * //       { medItemId: "2", medName: "브로피딘정", dose: "1정" },
 * //       { medItemId: "3", medName: "테세놀8시간이알서방정", dose: "1정" }
 * //     ]
 * //   },
 * //   {
 * //     time: "12:00",
 * //     medications: [
 * //       { medItemId: "1", medName: "펠루비정", dose: "1정" },
 * //       { medItemId: "3", medName: "테세놀8시간이알서방정", dose: "1정" }
 * //     ]
 * //   },
 * //   {
 * //     time: "18:00",
 * //     medications: [
 * //       { medItemId: "1", medName: "펠루비정", dose: "1정" },
 * //       { medItemId: "2", medName: "브로피딘정", dose: "1정" },
 * //       { medItemId: "3", medName: "테세놀8시간이알서방정", dose: "1정" }
 * //     ]
 * //   }
 * // ]
 */
