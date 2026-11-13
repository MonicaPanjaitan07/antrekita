"use client";

/** fetch JSON dengan pesan error yang ramah */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Gagal (${res.status})`) as Error & {
      status: number;
      details?: unknown;
    };
    err.status = res.status;
    err.details = (data as { details?: unknown }).details;
    throw err;
  }
  return data as T;
}
