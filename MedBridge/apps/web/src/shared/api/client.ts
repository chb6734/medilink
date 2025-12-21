"use client";

function getApiBaseUrl() {
  // Prefer explicit env
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // Default: match current hostname to keep session cookies first-party
  // (localhost vs 127.0.0.1 mismatch causes SameSite=Lax cookies to not be sent)
  if (typeof window !== "undefined") {
    const proto = window.location.protocol;
    const host = window.location.hostname; // keep same host string
    return `${proto}//${host}:8787`;
  }
  return "http://127.0.0.1:8787";
}

async function parseError(resp: Response) {
  const text = await resp.text();
  const err = new Error(text || resp.statusText);
  (err as any).status = resp.status;
  return err;
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
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
  init?: RequestInit,
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


