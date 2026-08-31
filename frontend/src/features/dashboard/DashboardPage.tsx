import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../../lib/api';
import { listPositions } from '../../api/positions';
import { listInterviews } from '../../api/interviews';
import type { InterviewListItem, JobPosition } from '../../api/types';
import type { MeResponse } from './types';
import StatusBadge from '../../components/StatusBadge';
import { formatDateTime } from '../../lib/format';

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong while loading your identity.';
}

function toSimpleError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong loading your interviews.';
}

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again to continue.';

export default function DashboardPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [positionFilter, setPositionFilter] = useState('');
  const [interviewLoading, setInterviewLoading] = useState(true);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api.get<MeResponse>('/api/me');
      setData(me);
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadPositions = useCallback(async () => {
    try {
      setPositions(await listPositions());
    } catch {
      // The position filter is best-effort: on failure the dashboard still
      // lists interviews, just without a working position filter.
    }
  }, []);

  useEffect(() => {
    void loadPositions();
  }, [loadPositions]);

  const loadInterviews = useCallback(async (positionId: string) => {
    setInterviewLoading(true);
    setInterviewError(null);
    setSessionExpired(false);
    try {
      const items = await listInterviews(undefined, positionId || undefined);
      setInterviews(items);
    } catch (err: unknown) {
      const apiError = err instanceof ApiError ? err : null;
      if (apiError !== null && apiError.status === 401) {
        // Session expired: surface it and never auto-retry.
        setSessionExpired(true);
        setInterviewError(SESSION_EXPIRED_MESSAGE);
      } else {
        setInterviewError(toSimpleError(err));
      }
    } finally {
      setInterviewLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInterviews(positionFilter);
  }, [positionFilter, loadInterviews]);

  const hasInterviewsError = interviewError !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Signed in</p>
      </div>

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
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-gray-900">Interviews</h2>

            <div className="flex items-center gap-2">
              <label htmlFor="position-filter" className="text-sm text-gray-600">
                Position
              </label>
              <select
                id="position-filter"
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All positions</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sessionExpired ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{SESSION_EXPIRED_MESSAGE}</p>
            </div>
          ) : hasInterviewsError ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{interviewError}</p>
              <button
                type="button"
                onClick={() => void loadInterviews(positionFilter)}
                disabled={interviewLoading}
                className="mt-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          ) : interviewLoading && interviews.length === 0 ? (
            <div className="mt-4 h-32 animate-pulse rounded border border-gray-200 bg-gray-50" aria-hidden="true" />
          ) : interviews.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-10 text-center">
              <p className="text-sm text-gray-500">
                {positionFilter
                  ? 'No interviews found for this position.'
                  : 'No interviews yet.'}
              </p>
              <Link
                to="/interviews/new"
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                Schedule an interview
              </Link>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Candidate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Scheduled
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {interviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {interview.candidateName ?? '—'}
                        </span>
                        {interview.candidateEmail ? (
                          <p className="text-xs text-gray-500">{interview.candidateEmail}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {interview.title ?? interview.positionName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {interview.positionName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDateTime(interview.scheduledStart)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={interview.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/interviews/${interview.id}`}
                          className="inline-block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
