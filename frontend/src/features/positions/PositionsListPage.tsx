import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { listPositions } from '../../api/positions';
import type { JobPosition } from '../../api/types';
import StatusBadge from '../../components/StatusBadge';
import ErrorBanner from '../../components/ErrorBanner';

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong loading positions.';
}

export default function PositionsListPage() {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPositions(await listPositions());
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-28 animate-pulse rounded border border-gray-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Positions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Reusable interview templates with segment structure.
          </p>
        </div>
        <Link
          to="/positions/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New position
        </Link>
      </div>

      {error !== null ? (
        <ErrorBanner onRetry={() => void load()} retrying={loading}>
          {error}
        </ErrorBanner>
      ) : positions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No positions yet.</p>
          <Link
            to="/positions/new"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Create your first position
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Segments
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {positions.map((position) => (
                <tr
                  key={position.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    window.location.href = `/positions/${position.id}`;
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-blue-700">
                      {position.name}
                    </span>
                    {position.description ? (
                      <p className="text-xs text-gray-500">{position.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={position.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {position.templates.length}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                      new Date(position.createdAt),
                    )}
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
