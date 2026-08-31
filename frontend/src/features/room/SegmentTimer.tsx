import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDuration } from '../../lib/format';
import type { RoomSegment } from './types';

interface SegmentTimerProps {
  currentSegment: RoomSegment | null;
  segments: RoomSegment[];
}

/** Fraction of planned duration at which the amber "approaching limit" warning
 * begins. Deterministic, documented, and purely client-side — no backend field. */
const NEAR_LIMIT_RATIO = 0.9;

function timestampMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Live elapsed seconds for a segment, recomputed from its authoritative server
 * timestamps on every call. Never accumulates a counter. A finished segment
 * uses its actualEnd as the stop; an active segment runs to "now".
 */
function segmentElapsedSeconds(segment: RoomSegment, now: number): number {
  const start = timestampMs(segment.actualStart);
  if (start === null) return 0;
  const end = segment.actualEnd !== null ? timestampMs(segment.actualEnd) ?? now : now;
  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * Total interview elapsed time. There is no interview-level start timestamp in
 * the room data, so the total is the sum of the per-segment authoritative
 * server timestamps (actualEnd - actualStart, or actualStart -> now while the
 * segment is still running). Recomputed from those timestamps each tick.
 */
function interviewElapsedSeconds(segments: RoomSegment[], now: number): number {
  return segments.reduce((sum, segment) => sum + segmentElapsedSeconds(segment, now), 0);
}

/**
 * Interview-room segment timer: shows the current segment's intended versus
 * actual elapsed time, warns as it approaches the planned limit and when it is
 * exceeded, and shows the total interview elapsed time. Display-only and
 * warning-only — it never blocks or disables any interview action. Elapsed time
 * is recomputed from server `actualStart`/`actualEnd` on every one-second tick;
 * no counter is accumulated and the interval is cleared on unmount.
 */
export default function SegmentTimer({ currentSegment, segments }: SegmentTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Kept in sync with the prop each render so a state-announcing effect below
  // only fires when `currentSegment` actually changes, avoiding stale closures.
  const previousSegmentId = useRef<string | null>(null);
  const lastAnnounced = useRef<string | null>(null);

  const segmentId = currentSegment?.id ?? null;
  const pageTitle =
    currentSegment === null
      ? 'No active segment'
      : currentSegment.actualStart === null
        ? 'Not started'
        : '';

  const elapsedSeconds = useMemo(
    () => (currentSegment ? segmentElapsedSeconds(currentSegment, now) : 0),
    [currentSegment, now],
  );

  const plannedSeconds = currentSegment ? currentSegment.plannedMinutes * 60 : 0;
  const started = currentSegment?.actualStart != null;
  const ratio = plannedSeconds > 0 ? elapsedSeconds / plannedSeconds : 0;

  const overflow = started && ratio >= 1;
  const nearLimit = started && !overflow && ratio >= NEAR_LIMIT_RATIO;
  const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds);

  const totalSeconds = useMemo(
    () => interviewElapsedSeconds(segments, now),
    [segments, now],
  );
  const totalPlannedMinutes = useMemo(
    () => segments.reduce((sum, s) => sum + s.plannedMinutes, 0),
    [segments],
  );

  const elapsedColor = !started
    ? 'text-gray-400'
    : overflow
      ? 'text-red-600'
      : nearLimit
        ? 'text-amber-600'
        : 'text-gray-900';

  const barClass =
    !started || plannedSeconds === 0
      ? 'bg-gray-300'
      : overflow
        ? 'bg-red-600'
        : nearLimit
          ? 'bg-amber-500'
          : 'bg-blue-600';

  const widthPct = plannedSeconds > 0 ? Math.min(100, Math.max(0, ratio * 100)) : 0;

  // Announce a warning state change once (not on every one-second tick). This
  // lives outside the visible hierarchy and is polite/non-disruptive.
  useEffect(() => {
    if (previousSegmentId.current === segmentId) return;
    previousSegmentId.current = segmentId;
    lastAnnounced.current = null;
  }, [segmentId]);

  const warningKey = overflow ? 'over' : nearLimit ? 'near' : 'none';
  useEffect(() => {
    if (warningKey === 'none' || warningKey === lastAnnounced.current) return;
    lastAnnounced.current = warningKey;
    const region = document.getElementById('segment-timer-live');
    if (region) {
      region.textContent =
        warningKey === 'over' ? 'This segment is over its planned time.' : 'Approaching planned limit.';
    }
  }, [warningKey]);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-gray-900">Session timer</h2>
        <p className="text-xs text-gray-500">Total {formatDuration(totalSeconds)}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {currentSegment ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-gray-900">
                {currentSegment.title}
              </p>
              <p className="shrink-0 text-xs text-gray-500">
                Planned: {currentSegment.plannedMinutes} min
              </p>
            </div>

            {started ? (
              <>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <p className={`text-2xl font-semibold tabular-nums ${elapsedColor}`}>
                    {formatDuration(elapsedSeconds)}
                  </p>
                  {overflow ? (
                    <p className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      Over planned time
                    </p>
                  ) : nearLimit ? (
                    <p className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Approaching planned limit
                    </p>
                  ) : (
                    <p className="shrink-0 text-xs text-gray-500">
                      {formatDuration(remainingSeconds)} remaining
                    </p>
                  )}
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full transition-[width] duration-1000 ${barClass}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-gray-400">Not started</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No active segment</p>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <p className="text-xs text-gray-500">Interview total</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums text-gray-900">
            {formatDuration(totalSeconds)}
          </p>
        </div>
        <p className="text-xs text-gray-500">{totalPlannedMinutes} min planned</p>
      </div>

      {/* Off-screen live region: announces warning state changes only, never the
          per-second ticking times. */}
      <div
        id="segment-timer-live"
        aria-live="polite"
        className="sr-only"
        role="status"
      >
        {pageTitle}
      </div>
    </section>
  );
}
