/**
 * 공통 포맷팅 유틸리티 함수
 */

// =============================================================================
// 날짜 포맷팅
// =============================================================================

/**
 * 날짜를 "M월 D일" 형식으로 포맷
 * @example formatDate("2024-01-15") => "1월 15일"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 날짜를 "M월 D일 (요일)" 형식으로 포맷
 * @example formatDateWithDay("2024-01-15") => "1월 15일 (월)"
 */
export function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
}

/**
 * 날짜를 "YYYY년 M월 D일" 형식으로 포맷
 * @example formatDateFull("2024-01-15") => "2024년 1월 15일"
 */
export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * 시간을 "HH:MM" 형식으로 포맷
 * @example formatTime("2024-01-15T09:30:00") => "09:30"
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * ISO 날짜 문자열에서 날짜 부분만 추출
 * @example extractDatePart("2024-01-15T09:30:00Z") => "2024-01-15"
 */
export function extractDatePart(dateStr: string): string {
  return dateStr.split('T')[0];
}

// =============================================================================
// 날짜 비교
// =============================================================================

/**
 * 해당 날짜가 오늘 이후인지 확인 (시간 무시)
 */
export function isDateInFuture(dateStr: string): boolean {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * 해당 시간이 현재 시간 이후인지 확인
 */
export function isTimeInFuture(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

/**
 * 해당 날짜가 오늘인지 확인
 */
export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * 두 날짜의 일수 차이 계산
 */
export function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// =============================================================================
// 전화번호 포맷팅
// =============================================================================

/**
 * 전화번호를 E.164 형식에서 한국 형식으로 변환
 * @example formatPhoneFromE164("+821012345678") => "010-1234-5678"
 */
export function formatPhoneFromE164(phoneE164: string): string {
  // +82 제거하고 0으로 시작
  const phone = phoneE164.replace(/^\+82/, '0');

  // 하이픈 추가
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  if (phone.length === 10) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return phone;
}

/**
 * 전화번호를 한국 형식에서 E.164로 변환
 * @example formatPhoneToE164("010-1234-5678") => "+821012345678"
 */
export function formatPhoneToE164(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    return `+82${cleaned.slice(1)}`;
  }
  return `+82${cleaned}`;
}

// =============================================================================
// 숫자 포맷팅
// =============================================================================

/**
 * 숫자에 천 단위 콤마 추가
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

/**
 * 퍼센트 포맷팅
 * @example formatPercent(0.856) => "85.6%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// =============================================================================
// 문자열 유틸
// =============================================================================

/**
 * 문자열 자르기 (말줄임)
 * @example truncate("긴 문자열입니다", 5) => "긴 문자..."
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

/**
 * 빈 문자열인지 확인
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

// =============================================================================
// UUID 유틸
// =============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 유효한 UUID인지 확인
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}
