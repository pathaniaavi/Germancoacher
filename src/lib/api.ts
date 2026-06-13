/** Typed client fetch helpers. Throw `ApiRequestError` on non-2xx. */
import type { ApiError } from "./dto";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let body: ApiError = { error: res.statusText };
    try {
      body = (await res.json()) as ApiError;
    } catch {
      /* keep statusText */
    }
    throw new ApiRequestError(res.status, body.error ?? "Request failed", body.details);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiGet = <T>(url: string) => request<T>(url);
export const apiPost = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "POST", body: JSON.stringify(body) });
export const apiPatch = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T>(url: string) => request<T>(url, { method: "DELETE" });
