"use client";

import { getApiBaseUrl } from "@/shared/lib/config";

async function parseError(resp: globalThis.Response) {
  const text = await resp.text();
  let message = text || resp.statusText || `API Error ${resp.status}`;

  // 만약 응답이 JSON 형태라면 message 필드만 추출 시도
  try {
    const json = JSON.parse(text);
    if (json.message) {
      message = json.message;
    }
  } catch {
    // JSON이 아니면 기존 text 사용
  }

  const err = new Error(String(message));
  (err as any).status = resp.status;
  return err;
}

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
