/**
 * Format phone number with dashes (010-0000-0000)
 */
export function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/[^\d]/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * Convert Korean phone number to E.164 format (+82XXXXXXXXX)
 */
export function toE164Kr(phoneLike: string): string {
  const raw = phoneLike.trim();
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return raw;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  if (digits.startsWith("82")) return `+${digits}`;
  return `+82${digits}`;
}
