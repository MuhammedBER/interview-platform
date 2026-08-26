import { getToken, keycloak, updateToken } from './keycloak';

  const API_BASE = 'http://localhost:8080';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
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
    throw new ApiError(401, 'Unauthorized — redirecting to Keycloak login.');
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${method} ${API_BASE}${path} failed with ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>({ method: 'GET', path });
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>({ method: 'POST', path, body });
  },
};
