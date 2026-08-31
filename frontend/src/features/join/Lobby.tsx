import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import RefusalScreen, { type RefusalVariant } from './RefusalScreen';
import { refusalVariantFor } from './JoinPage';

export interface JoinLobbyStatusResponse {
  admitted: boolean;
  scheduledStart: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

interface LobbyProps {
  token: string;
  interviewTitle: string;
  recruiterName: string;
  scheduledStart: string;
  durationMinutes: number;
}

type LobbyStatus = 'waiting' | 'admitted' | 'failure' | 'network-retry';

const POLL_INTERVAL_MS = 4000;

/** The FE4-09 candidate room route, reached once the recruiter admits the candidate. */
function roomPath(token: string): string {
  return `/join/${token}/room`;
}

function isLobbyStatusResponse(value: unknown): value is JoinLobbyStatusResponse {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.admitted === 'boolean' &&
    typeof record.scheduledStart === 'string' &&
    (record.status === 'SCHEDULED' ||
      record.status === 'IN_PROGRESS' ||
      record.status === 'COMPLETED' ||
      record.status === 'CANCELLED' ||
      record.status === 'NO_SHOW')
  );
}

export default function Lobby({
  token,
  interviewTitle,
  recruiterName,
  scheduledStart,
  durationMinutes,
}: LobbyProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<LobbyStatus>('waiting');
  const [variant, setVariant] = useState<RefusalVariant>('not_found');
  const activeRef = useRef(true);
  const failureCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitingPosted = useRef(false);

  /**
   * Tell the backend the candidate is present. Public endpoint, no bearer token.
   * Called once on mount; retried only when polling detects the session dropped.
   */
  async function announcePresent() {
    if (waitingPosted.current) return;
    waitingPosted.current = true;
    try {
      await fetch(`${API_BASE}/api/public/join-tokens/${token}/waiting`, {
        method: 'POST',
      });
    } catch {
      // Ignored; a retry may happen if polling later detects a dropped session.
    }
  }

  function scheduleNextPoll() {
    timerRef.current = setTimeout(() => {
      void poll();
    }, POLL_INTERVAL_MS);
  }

  async function poll() {
    if (!activeRef.current) return;

    try {
      const response = await fetch(`${API_BASE}/api/public/join-tokens/${token}/status`);

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!activeRef.current) return;

      if (!response.ok) {
        failureCountRef.current = 0;
        setStatus('failure');
        setVariant(refusalVariantFor(response.status, body));
        return;
      }

      failureCountRef.current = 0;

      if (!isLobbyStatusResponse(body)) {
        setStatus('failure');
        setVariant(refusalVariantFor(response.status, body));
        return;
      }

      if (body.status === 'CANCELLED') {
        setStatus('failure');
        setVariant('revoked');
        return;
      }

      if (body.admitted) {
        setStatus('admitted');
        navigate(roomPath(token), { replace: true });
        return;
      }

      scheduleNextPoll();
    } catch {
      if (!activeRef.current) return;
      failureCountRef.current += 1;
      if (failureCountRef.current >= 3) {
        setStatus('network-retry');
        waitingPosted.current = false;
        void announcePresent();
      } else {
        scheduleNextPoll();
      }
    }
  }

  function handleRetry() {
    failureCountRef.current = 0;
    waitingPosted.current = false;
    setStatus('waiting');
    void announcePresent();
    void poll();
  }

  useEffect(() => {
    activeRef.current = true;
    failureCountRef.current = 0;
    waitingPosted.current = false;

    void announcePresent();
    void poll();

    return () => {
      activeRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [token]);

  if (status === 'failure') {
    return <RefusalScreen variant={variant} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">{interviewTitle}</h1>
        <dl className="mt-6 space-y-3">
          <div>
            <dt className="text-xs text-gray-500">Recruiter</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{recruiterName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Scheduled</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatDateTime(scheduledStart)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Duration</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{durationMinutes} min</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-gray-200 pt-6" aria-live="polite">
          {status === 'waiting' ? (
            <>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Waiting for the interviewer to admit you…</span>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Make sure your camera and microphone are ready — you won't need to do anything
                else here.
              </p>
            </>
          ) : status === 'admitted' ? (
            <p className="text-sm text-gray-600">You've been admitted. Preparing to join the call…</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">We're having trouble checking your status.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-3 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
