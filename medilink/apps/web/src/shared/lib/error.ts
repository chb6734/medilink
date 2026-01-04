/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "알 수 없는 오류가 발생했습니다.";
}

/**
 * Discriminated union for operation results
 * Use this for operations that can fail
 */
export type OperationResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string };

/**
 * Create a success result
 */
export function success<T>(data: T): OperationResult<T> {
  return { ok: true, data };
}

/**
 * Create a failure result
 */
export function failure<T>(reason: string): OperationResult<T> {
  return { ok: false, reason };
}

/**
 * API Error type with optional status code
 */
export interface ApiError extends Error {
  status?: number;
}

/**
 * Check if error is an API error with status
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && "status" in error;
}
