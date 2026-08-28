import { getToken, keycloak, updateToken } from './keycloak';

const DEFAULT_GATEWAY_URL = 'http://localhost:8080';

export const API_BASE = (
  import.meta.env.VITE_GATEWAY_URL as string | undefined
) || DEFAULT_GATEWAY_URL;

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldError[];

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    // fix prototype chain under transpiled class extends (es5 target)
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
}

function readErrorBody(status: number, raw: string): { message: string; fieldErrors: FieldError[] } {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const rawErrors: unknown = (parsed as { errors?: unknown }).errors;
      const errors = Array.isArray(rawErrors) ? rawErrors : [];
      const fieldErrors: FieldError[] = errors
        .filter((e: unknown): e is FieldError => typeof e === 'object' && e !== null)
        .map((e: FieldError) => ({
          field: String(e.field ?? ''),
          message: String(e.message ?? ''),
        }))
        .filter((e) => e.message !== '');

      const message =
        typeof parsed.message === 'string' && parsed.message.trim() !== ''
          ? parsed.message
          : fallbackMessage(status);
      return { message, fieldErrors };
    }
  } catch {
    // not JSON; fall through
  }
  return { message: fallbackMessage(status), fieldErrors: [] };
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The request was not valid. Please review the highlighted fields.';
    case 403:
      return 'Your account has no recruiter profile in this organisation.';
    case 404:
      return 'The requested resource was not found. It may belong to another organisation.';
    case 409:
      return 'This interview can no longer be changed. Reload the interview to see its current status.';
    default:
      return `Request failed (${status}).`;
  }
}

async function request<T>({ method, path, body }: RequestOptions): Promise<T> {
  await updateToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken() ?? ''}`,
  };

  let payload: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
  });

  if (response.status === 401) {
    void keycloak.login();
    throw new ApiError(401, 'Your session has expired — redirecting to login.');
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    const { message, fieldErrors } = readErrorBody(response.status, raw);
    throw new ApiError(response.status, message, fieldErrors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>({ method: 'GET', path });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>({ method: 'POST', path, body });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>({ method: 'PUT', path, body });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>({ method: 'DELETE', path });
  },
};
