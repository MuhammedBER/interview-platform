import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../../lib/api';
import type { MeResponse } from './types';

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong while loading your identity.';
}

export default function DashboardPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.get<MeResponse>('/api/me');
      setData(me);
      setError(null);
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Signed in</p>
      </div>

      {error !== null ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="mt-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900">Your identity</h2>
            {loading || data === null ? (
              <div className="mt-4 space-y-4" aria-hidden="true">
                <div className="h-4 w-72 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
              </div>
            ) : (
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Subject</dt>
                  <dd className="mt-0.5 break-all text-sm text-gray-900">{data.subject}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Organization ID</dt>
                  <dd className="mt-0.5 break-all text-sm text-gray-900">
                    {data.organizationId ?? '—'}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {!loading && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900">Interviews</h2>
              <p className="mt-1 text-sm text-gray-500">
                Your interviews will appear here in a later phase.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
