"use client";

import { getApiBaseUrl } from "@/shared/lib/config";
import type { ApiError } from "@/shared/lib/error";

/**
 * Create an API error with status code
 *
 * This function properly types the error object, eliminating the need for `any`.
 * The ApiError interface extends Error and adds an optional status property.
 *
 * Design Principle: Predictability
 * - Consistent return type (ApiError) for all error cases
 * - Type-safe error handling without `any` casting
 */
function createApiError(message: string, status: number): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

/**
 * Parse error response from API
 *
 * @param resp - The fetch Response object
 * @returns An ApiError with the parsed message and status code
 */
async function parseError(resp: globalThis.Response): Promise<ApiError> {
  const text = await resp.text();
  let message = text || resp.statusText || `API Error ${resp.status}`;

  // Try to extract message field if response is JSON
  try {
    const json = JSON.parse(text);
    if (json.message) {
      message = json.message;
    }
  } catch {
    // Not JSON, use the raw text
  }

  return createApiError(String(message), resp.status);
}

/**
 * Fetch JSON data from API
 *
 * @param path - API endpoint path
 * @param init - Optional fetch init options
 * @returns Parsed JSON response
 * @throws ApiError on non-ok responses
 */
export async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const API_BASE_URL = getApiBaseUrl();
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  if (!resp.ok) throw await parseError(resp);
  return (await resp.json()) as T;
}

/**
 * Submit form data to API
 *
 * @param path - API endpoint path
 * @param form - FormData to submit
 * @param init - Optional fetch init options
 * @returns Parsed JSON response
 * @throws ApiError on non-ok responses
 */
export async function fetchForm<T>(
  path: string,
  form: FormData,
  init?: RequestInit
): Promise<T> {
  const API_BASE_URL = getApiBaseUrl();
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: form,
    credentials: "include",
    ...init,
  });

  if (!resp.ok) throw await parseError(resp);
  return (await resp.json()) as T;
}
