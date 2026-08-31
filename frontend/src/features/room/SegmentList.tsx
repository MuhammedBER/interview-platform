import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { endSegment, startSegment } from './api';
import type { RoomSegment } from './types';

interface SegmentListProps {
  interviewId: string;
  /** Ordered segments from the room bootstrap. */
  segments: RoomSegment[];
  /** The segment currently being worked on, per the server bootstrap. */
  currentSegment: RoomSegment | null;
  /** Refetches the authoritative room bootstrap after a write. */
  onRefetch: () => Promise<void>;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return new ApiError(0, message);
}

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again to continue.';

/**
 * Recruiter interview-room segment list. Shows segments in ascending
 * `orderIndex`, highlights the current segment, marks ended segments completed,
 * and lets the recruiter advance to the next segment. Segment timing is
 * authoritative server-side: starting and ending go through the existing
 * `.../start` and `.../end` endpoints and the bootstrap is refetched afterwards.
 *
 * Advancing is always allowed — the segment timer is warning-only and never
 * blocks it, whether the current segment is early, exactly on time, or over its
 * planned duration. The planned duration is informational only.
 */
export default function SegmentList({
  interviewId,
  segments,
  currentSegment,
  onRefetch,
}: SegmentListProps) {
  const [busy, setBusy] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      inFlight.current = false;
    };
  }, []);

  const sorted = useMemo(
    () => [...segments].sort((a, b) => a.orderIndex - b.orderIndex),
    [segments],
  );

  // The next segment to begin: the earliest by orderIndex that has not started.
  const nextToRun = useMemo(
    () => sorted.find((s) => s.actualStart === null) ?? null,
    [sorted],
  );

  // The first segment to start when nothing is currently running.
  const firstToStart = useMemo(
    () => sorted.find((s) => s.actualStart === null) ?? null,
    [sorted],
  );

  // Upcoming segment after the current one (by ascending orderIndex, not started).
  const nextAfterCurrent = useMemo(() => {
    if (!currentSegment) return null;
    return (
      sorted.find(
        (s) => s.orderIndex > currentSegment.orderIndex && s.actualStart === null,
      ) ?? null
    );
  }, [sorted, currentSegment]);

  const isFinalSegment =
    currentSegment !== null &&
    nextAfterCurrent === null &&
    currentSegment.actualEnd === null;

  async function setBusySafe(next: boolean) {
    if (mounted.current) setBusy(next);
  }

  function runAdvance() {
    if (inFlight.current) return;
    inFlight.current = true;
    void setBusySafe(true);
    setAdvanceError(null);

    void (async () => {
      try {
        if (currentSegment) {
          await endSegment(interviewId, currentSegment.id);
        }
        const next = currentSegment ? nextAfterCurrent : firstToStart;
        if (next) {
          await startSegment(interviewId, next.id);
        }
        await onRefetch();
      } catch (err) {
        if (!mounted.current) return;
        const apiError = toApiError(err);
        setAdvanceError(
          apiError.status === 401 ? SESSION_EXPIRED_MESSAGE : apiError.message,
        );
        // If the current segment was ended but the next failed to start (or any
        // write failed), refetch so the UI reflects the actual server state and
        // never pretends a write succeeded when it did not.
        void onRefetch().catch(() => {
          if (!mounted.current) return;
          // Surface refetch failures silently; the original error is shown above.
        });
      } finally {
        inFlight.current = false;
        void setBusySafe(false);
      }
    })();
  }

  if (sorted.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Segments</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">No segments for this interview</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium text-gray-900">Segments</h2>

      {advanceError !== null ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {advanceError}
          <button
            type="button"
            onClick={() => void onRefetch()}
            className="ml-3 inline text-sm font-medium text-red-700 underline hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Reload
          </button>
        </div>
      ) : null}

      <ol className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {sorted.map((segment) => {
          const isCurrent = currentSegment?.id === segment.id;
          const completed = segment.actualEnd !== null;
          const isNextToRun = nextToRun?.id === segment.id;

          let action: React.ReactNode = null;
          if (isCurrent && nextAfterCurrent) {
            action = (
              <button
                type="button"
                disabled={busy}
                onClick={runAdvance}
                aria-label={`Advance past ${segment.title}`}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Advancing…' : 'Advance'}
              </button>
            );
          } else if (isCurrent && isFinalSegment) {
            action = (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Final segment
              </span>
            );
          } else if (!currentSegment && isNextToRun && !completed) {
            action = (
              <button
                type="button"
                disabled={busy}
                onClick={runAdvance}
                aria-label={`Start ${segment.title}`}
                className="rounded-md border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Starting…' : 'Start'}
              </button>
            );
          }

          return (
            <li
              key={segment.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${
                isCurrent ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {completed ? (
                    <span
                      aria-label="Completed"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  ) : isCurrent ? (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
                      aria-label="Current segment"
                    />
                  ) : (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-gray-300"
                      aria-label="Upcoming"
                    />
                  )}
                  <span
                    className={`truncate text-sm ${
                      isCurrent ? 'font-medium text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    {segment.orderIndex + 1}. {segment.title}
                  </span>
                </div>
                <p className="mt-0.5 pl-7 text-xs text-gray-500">{segment.plannedMinutes} min</p>
              </div>
              <div className="shrink-0">{action}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
