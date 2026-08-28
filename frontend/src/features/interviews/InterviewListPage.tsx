import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { listInterviews } from '../../api/interviews';
import type { InterviewListItem, InterviewStatus } from '../../api/types';
import StatusBadge from '../../components/StatusBadge';
import ErrorBanner from '../../components/ErrorBanner';
import { formatDateTime } from '../../lib/format';

const STATUSES: InterviewStatus[] = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong loading interviews.';
}

export default function InterviewListPage() {
  const [status, setStatus] = useState<InterviewStatus | 'ALL'>('ALL');
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInterviews(await listInterviews(status === 'ALL' ? undefined : status));
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectClass =
    'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Interviews</h1>
          <p className="mt-1 text-sm text-gray-500">Candidate interviews in your organisation.</p>
        </div>
        <Link
          to="/interviews/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Schedule interview
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Status:</label>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as InterviewStatus | 'ALL')}
        >
          <option value="ALL">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error !== null ? (
        <ErrorBanner onRetry={() => void load()} retrying={loading}>
          {error}
        </ErrorBanner>
      ) : loading ? (
        <div className="h-32 animate-pulse rounded border border-gray-200 bg-white" aria-hidden="true" />
      ) : interviews.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            {status === 'ALL'
              ? 'No interviews scheduled yet.'
              : `No interviews with status ${status}.`}
          </p>
          <Link
            to="/interviews/new"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Schedule an interview
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Candidate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Scheduled
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Segments
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {interviews.map((interview) => (
                <tr
                  key={interview.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    window.location.href = `/interviews/${interview.id}`;
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">
                      {interview.candidateName ?? '—'}
                    </span>
                    {interview.candidateEmail ? (
                      <p className="text-xs text-gray-500">{interview.candidateEmail}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {interview.positionName ?? 'Ad-hoc'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatDateTime(interview.scheduledStart)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {interview.durationMinutes} min
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {interview.segmentCount}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={interview.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
