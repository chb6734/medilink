"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8787";

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
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: form,
    credentials: "include",
    ...init,
  });

  if (!resp.ok) throw await parseError(resp);
  return (await resp.json()) as T;
}


