import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useRoomData } from './useRoomData';
import { admitCandidate, getRecruiterVideoToken, getWaitingStatus, startInterview } from './api';
import type { WaitingStatus } from './types';
import { formatDateTime } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import CockpitPanel from './CockpitPanel';
import { useZegoRoom } from './useZegoRoom';
import VideoTiles from './VideoTiles';
import RoomControls from './RoomControls';

const WAITING_POLL_INTERVAL_MS = 4000;

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return new ApiError(0, message);
}

export default function InterviewRoomPage() {
  const { id } = useParams<{ id: string }>();
  const interviewId = id ?? '';

  const { room, loading, error, refetch } = useRoomData(interviewId);
  const [waitingStatus, setWaitingStatus] = useState<WaitingStatus | null>(null);
  const [admitting, setAdmitting] = useState(false);
  const [admitError, setAdmitError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [left, setLeft] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const admitInFlight = useRef(false);
  const startedRef = useRef(false);
  const startInFlightRef = useRef(false);

  const video = useZegoRoom({
    fetchToken: useCallback(() => getRecruiterVideoToken(interviewId), [interviewId]),
    role: 'recruiter',
  });

  // Auto-start this interview once the recruiter successfully joins the ZEGO
  // room. `startInterview` is idempotent on the backend (SCHEDULED -> IN_PROGRESS;
  // already IN_PROGRESS -> current), guarded here by a ref so it only fires once
  // per page load. Non-blocking: on failure the call stays up and a warning
  // banner is shown instead of a full-screen error.
  useEffect(() => {
    if (startedRef.current || startInFlightRef.current || !video.joined) return;
    startedRef.current = true;
    void (async () => {
      startInFlightRef.current = true;
      try {
        await startInterview(interviewId);
        setStartError(null);
        void refetch();
      } catch (err) {
        const apiError = toApiError(err);
        if (apiError.status === 401) {
          setStartError('Your session has expired. The interview could not be started.');
        } else if (apiError.status === 409) {
          // Already started/completed elsewhere; refresh so the header is correct.
          setStartError(null);
          void refetch();
        } else {
          setStartError('The interview could not be marked as started. You can continue the call.');
        }
      } finally {
        startInFlightRef.current = false;
      }
    })();
  }, [video.joined, interviewId, refetch]);

  useEffect(() => {
    if (!room || room.interview.admitted) {
      setWaitingStatus(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function pollOnce() {
      try {
        const next = await getWaitingStatus(interviewId);
        if (cancelled) return;
        setWaitingStatus(next);
        if (next.admitted) {
          void refetch();
          return;
        }
      } catch {
        if (cancelled) return;
      }
      timer = setTimeout(() => {
        void pollOnce();
      }, WAITING_POLL_INTERVAL_MS);
    }

    void pollOnce();

    return () => {
      cancelled = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [room, interviewId, refetch]);

  if (!id) {
    return <ErrorState message="Interview not found" />;
  }

  if (loading && !room) {
    return <LoadingSkeleton />;
  }

  if (error !== null) {
    const message =
      error.status === 401
        ? 'Your session has expired. Please sign in again to continue.'
        : error.message;
    if (error.status === 401) {
      return <SessionExpired message={message} />;
    }
    return (
      <ErrorState
        message={message}
        canRetry
        onRetry={() => {
          setAdmitError(null);
          void refetch();
        }}
      />
    );
  }

  if (!room) {
    return <ErrorState message="Interview not found" />;
  }

  const { interview } = room;
  const candidateWaiting =
    waitingStatus !== null &&
    waitingStatus.waiting &&
    !waitingStatus.admitted &&
    !interview.admitted;

  async function handleAdmit() {
    if (admitInFlight.current) return;
    admitInFlight.current = true;
    setAdmitting(true);
    setAdmitError(null);
    try {
      await admitCandidate(interviewId);
      await refetch();
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.status === 401) {
        setAdmitError('Your session has expired. Please sign in again to continue.');
      } else {
        setAdmitError(apiError.message);
      }
    } finally {
      setAdmitting(false);
      admitInFlight.current = false;
    }
  }

  function handleToggleMic() {
    video.mute();
  }

  function handleToggleCamera() {
    video.toggleCamera();
  }

  function handleHangUp() {
    setLeaving(true);
    video.leave();
    setLeft(true);
  }

  if (left) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 px-6">
        <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 text-center" role="alert">
          <p className="text-base text-white">The call has ended.</p>
          <p className="mt-3 text-sm text-gray-400">
            You may return to the interviews list or close this window.
          </p>
          <Link
            to="/interviews"
            className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Return to interviews
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-800 px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/interviews" className="shrink-0 text-sm text-gray-400 hover:text-gray-200">
            ← Back
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-xl font-semibold">Interview Room</h1>
              <StatusBadge status={interview.status} />
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              Scheduled {formatDateTime(interview.scheduledStart)} · {interview.durationMinutes} min
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {video.error !== null ? (
            <div
              role="alert"
              className="m-4 shrink-0 rounded-md border border-red-800 bg-red-900/50 px-3 py-2 text-sm text-red-200"
            >
              {video.error}
            </div>
          ) : null}

          {startError !== null ? (
            <div
              role="status"
              aria-live="polite"
              className="mx-4 mt-4 shrink-0 rounded-md border border-amber-700 bg-amber-900/40 px-3 py-2 text-sm text-amber-200"
            >
              {startError}
            </div>
          ) : null}

          {admitting || candidateWaiting ? (
            <div
              role="status"
              aria-live="polite"
              className="mx-4 mt-4 flex shrink-0 items-center justify-between gap-4 rounded-md border border-gray-700 bg-gray-800 px-4 py-3"
            >
              <p className="text-sm text-white">Candidate is waiting</p>
              <button
                type="button"
                disabled={admitting}
                onClick={() => void handleAdmit()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {admitting ? 'Admitting…' : 'Admit'}
              </button>
            </div>
          ) : null}

          {admitError !== null ? (
            <div
              role="alert"
              className="mx-4 mt-4 shrink-0 rounded-md border border-red-800 bg-red-900/50 px-3 py-2 text-sm text-red-200"
            >
              {admitError}
            </div>
          ) : null}

          {video.joined ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <VideoTiles
                localLabel="Recruiter"
                localStream={video.localStream}
                remoteStreams={video.remoteStreams}
                remoteLabel="Candidate"
                localCameraOn={video.cameraOn}
              />
              <RoomControls
                micOn={video.micOn}
                cameraOn={video.cameraOn}
                joined={video.joined}
                leaving={leaving}
                onToggleMic={handleToggleMic}
                onToggleCamera={handleToggleCamera}
                onHangUp={handleHangUp}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center px-6" aria-live="polite">
              {video.error === null ? (
                <p className="text-base text-white">Connecting to the call…</p>
              ) : null}
            </div>
          )}
        </main>

        <aside className="shrink-0 border-l border-gray-200 bg-white">
          <CockpitPanel
            interview={interview}
            segments={room.segments}
            currentSegment={room.currentSegment}
            refetch={refetch}
          />
        </aside>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white" aria-busy="true" aria-label="Loading room">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-800 px-6 py-3">
        <div className="h-5 w-56 animate-pulse rounded bg-gray-800" aria-hidden="true" />
      </div>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-800 px-6 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-700" aria-hidden="true" />
        <div className="h-8 w-24 animate-pulse rounded bg-gray-700" aria-hidden="true" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 gap-4 p-6">
          <div className="flex-1 animate-pulse rounded-lg bg-gray-800" aria-hidden="true" />
          <div className="flex-1 animate-pulse rounded-lg bg-gray-800" aria-hidden="true" />
        </div>
        <div className="h-full w-[380px] shrink-0 animate-pulse bg-gray-700" aria-hidden="true" />
      </div>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  canRetry?: boolean;
  onRetry?: () => void;
}

function ErrorState({ message, canRetry = false, onRetry }: ErrorStateProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 px-6">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 text-center" role="alert">
        <p className="text-sm text-white">{message}</p>
        {canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SessionExpired({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 px-6">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 text-center" role="alert">
        <p className="text-sm text-white">{message}</p>
        <Link
          to="/interviews"
          className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Return to interviews
        </Link>
      </div>
    </div>
  );
}