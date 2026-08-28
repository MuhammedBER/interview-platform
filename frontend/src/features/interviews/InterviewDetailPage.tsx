import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import {
  cancelInterview,
  completeInterview,
  getInterview,
  markNoShow,
  rescheduleInterview,
} from '../../api/interviews';
import type { Interview } from '../../api/types';
import StatusBadge from '../../components/StatusBadge';
import ErrorBanner from '../../components/ErrorBanner';
import FieldErrors from '../../components/FieldErrors';
import { formatDateTime, fromLocalDatetimeValue, toLocalDatetimeValue } from '../../lib/format';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

const actionClass =
  'rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40';

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleLocal, setRescheduleLocal] = useState('');
  const [rescheduleDuration, setRescheduleDuration] = useState<number | ''>('');
  const [rescheduleFieldErrors, setRescheduleFieldErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setBanner(null);
    try {
      setInterview(await getInterview(id));
    } catch (err: unknown) {
      setBanner(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (interview && !banner) {
      setRescheduleLocal(toLocalDatetimeValue(interview.scheduledStart));
      setRescheduleDuration(interview.durationMinutes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview?.id]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded border border-gray-200 bg-white" aria-hidden="true" />;
  }

  if (!interview) {
    return (
      <div className="space-y-6">
        <Link to="/interviews" className="text-sm text-gray-500 hover:text-gray-800">
          ← Interviews
        </Link>
        {banner !== null ? <ErrorBanner>{banner}</ErrorBanner> : null}
      </div>
    );
  }

  const isScheduled = interview.status === 'SCHEDULED';
  const disabledTooltip = isScheduled
    ? undefined
    : `Only available while the interview is SCHEDULED (current: ${interview.status}).`;

  async function runAction(action: 'cancel' | 'no-show' | 'complete') {
    if (!id) return;
    setBusy(action);
    setBanner(null);
    try {
      const fn = action === 'cancel' ? cancelInterview : action === 'no-show' ? markNoShow : completeInterview;
      await fn(id);
      setShowReschedule(false);
      await load();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setBanner(`${toErrorMessage(err)} — reloading to reflect the current state.`);
        await load();
      } else {
        setBanner(toErrorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleReschedule() {
    if (!id) return;
    setBusy('reschedule');
    setBanner(null);
    setRescheduleFieldErrors([]);
    try {
      await rescheduleInterview(id, {
        scheduledStart: fromLocalDatetimeValue(rescheduleLocal),
        durationMinutes: rescheduleDuration === '' ? null : Number(rescheduleDuration),
      });
      setShowReschedule(false);
      await load();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 400 && err.fieldErrors.length > 0) {
        setRescheduleFieldErrors(err.fieldErrors.map((e) => `${e.field}: ${e.message}`));
      } else {
        setBanner(toErrorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/interviews" className="text-sm text-gray-500 hover:text-gray-800">
          ← Interviews
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Interview details</h1>
      </div>

      {banner !== null ? <ErrorBanner onRetry={() => void load()} retrying={loading}>{banner}</ErrorBanner> : null}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Status</dt>
              <dd className="mt-0.5">
                <StatusBadge status={interview.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Scheduled start</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {formatDateTime(interview.scheduledStart)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Duration</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{interview.durationMinutes} min</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Position</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {interview.jobPositionId ? 'Linked to a position' : 'Ad-hoc'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Admitted</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{interview.admitted ? 'Yes' : 'No'}</dd>
            </div>
            {interview.cancelledAt ? (
              <div>
                <dt className="text-xs text-gray-500">Cancelled at</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{formatDateTime(interview.cancelledAt)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              disabled={!isScheduled || busy !== null}
              title={disabledTooltip}
              onClick={() => setShowReschedule((v) => !v)}
              className={`${actionClass} border-blue-300 text-blue-700 hover:bg-blue-50`}
            >
              Reschedule
            </button>
            <button
              type="button"
              disabled={!isScheduled || busy !== null}
              title={disabledTooltip}
              onClick={() => void runAction('cancel')}
              className={`${actionClass} border-gray-300 text-gray-700 hover:bg-gray-50`}
            >
              {busy === 'cancel' ? 'Cancelling…' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={!isScheduled || busy !== null}
              title={disabledTooltip}
              onClick={() => void runAction('no-show')}
              className={`${actionClass} border-amber-300 text-amber-700 hover:bg-amber-50`}
            >
              {busy === 'no-show' ? 'Marking…' : 'No-show'}
            </button>
            <button
              type="button"
              disabled={!isScheduled || busy !== null}
              title={disabledTooltip}
              onClick={() => void runAction('complete')}
              className={`${actionClass} border-green-300 text-green-700 hover:bg-green-50`}
            >
              {busy === 'complete' ? 'Completing…' : 'Complete'}
            </button>
          </div>
        </div>
      </div>

      {showReschedule && isScheduled ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Reschedule interview</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                New scheduled start
              </label>
              <input
                type="datetime-local"
                className={inputClass}
                value={rescheduleLocal}
                onChange={(e) => setRescheduleLocal(e.target.value)}
              />
              <FieldErrors errors={rescheduleFieldErrors} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Duration (minutes) <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={rescheduleDuration}
                onChange={(e) =>
                  setRescheduleDuration(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={busy === 'reschedule'}
              onClick={() => void handleReschedule()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === 'reschedule' ? 'Rescheduling…' : 'Confirm reschedule'}
            </button>
            <button
              type="button"
              onClick={() => setShowReschedule(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Interview segments ({interview.segments.length})
        </h2>
        {interview.segments.length === 0 ? (
          <p className="text-sm text-gray-500">No segments.</p>
        ) : (
          <ol className="space-y-3">
            {interview.segments.map((segment) => (
              <li
                key={segment.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {segment.orderIndex + 1}. {segment.title}
                  </span>
                  <span className="text-xs text-gray-500">{segment.plannedMinutes} min</span>
                </div>
                {segment.preparedQuestions.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {segment.preparedQuestions.map((q, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        {q}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">No prepared questions.</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
