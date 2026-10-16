const API_BASE = '/api';

export class ApiRequestError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = 'ApiRequestError';
  }
}

// Sessions live in an httpOnly cookie that scripts cannot read. State-changing requests also
// send this header, which the API requires for cookie-authenticated calls (CSRF defence).
const CSRF_HEADERS = { 'X-Ownly-CSRF': '1' };

/** fetch() wrapper for raw calls (uploads, blob downloads): sends the session cookie + CSRF header. */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: { ...CSRF_HEADERS, ...((init.headers as Record<string, string>) || {}) },
  });
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authFetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred.';
    try {
      const errorJson = await response.json();
      if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail.map((d: { msg?: string }) => d.msg || 'Validation error').join(', ');
      }
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new ApiRequestError(response.status, errorDetail);
  }

  return response.json();
}

