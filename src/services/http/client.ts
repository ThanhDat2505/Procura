import { ApiError } from '../contracts';

/**
 * Minimal fetch wrapper for the future Procura REST API.
 * Auth: bearer token stored by `setAuthToken` after login. Errors: `{ code, message }` JSON → ApiError.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
let token: string | null = null;

export function setAuthToken(value: string | null): void {
  token = value;
}

type Query = Record<string, string | number | boolean | undefined | string[]>;

function toQuery(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
    else params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function http<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  options: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}${toQuery(options.query)}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    let code = 'errors.generic';
    let message = res.statusText;
    try {
      const data = (await res.json()) as { code?: string; message?: string };
      code = data.code ?? code;
      message = data.message ?? message;
    } catch {
      // Non-JSON error body.
    }
    throw new ApiError(code, message, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
