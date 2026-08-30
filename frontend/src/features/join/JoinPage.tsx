import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../../lib/api';
import RefusalScreen, { type RefusalVariant } from './RefusalScreen';
import Lobby from './Lobby';

export interface JoinTokenValidationResponse {
  interviewTitle: string;
  scheduledStart: string;
  durationMinutes: number;
  recruiterName: string;
  candidateName: string;
}

interface JoinTokenRefusalResponse {
  reason: 'NOT_FOUND' | 'REVOKED' | 'USED' | 'EXPIRED' | 'OUTSIDE_WINDOW';
}

type JoinStatus = 'loading' | 'success' | 'failure';

function refusalReason(body: unknown): JoinTokenRefusalResponse['reason'] | null {
  if (typeof body !== 'object' || body === null) return null;
  const reason = (body as { reason?: unknown }).reason;
  if (
    reason === 'NOT_FOUND' ||
    reason === 'REVOKED' ||
    reason === 'USED' ||
    reason === 'EXPIRED' ||
    reason === 'OUTSIDE_WINDOW'
  ) {
    return reason;
  }
  return null;
}

export function refusalVariantFor(status: number, body: unknown): RefusalVariant {
  const reason = refusalReason(body);
  if (status === 404 && reason === 'NOT_FOUND') return 'not_found';
  if (status === 410 && reason === 'REVOKED') return 'revoked';
  if (status === 410 && reason === 'USED') return 'used';
  if (status === 410 && reason === 'EXPIRED') return 'expired';
  if (status === 403 && reason === 'OUTSIDE_WINDOW') return 'outside_window';
  return 'not_found';
}

function isValidationResponse(value: unknown): value is JoinTokenValidationResponse {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.interviewTitle === 'string' &&
    typeof record.scheduledStart === 'string' &&
    typeof record.durationMinutes === 'number' &&
    typeof record.recruiterName === 'string' &&
    typeof record.candidateName === 'string'
  );
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<JoinStatus>('loading');
  const [data, setData] = useState<JoinTokenValidationResponse | null>(null);
  const [variant, setVariant] = useState<RefusalVariant>('not_found');

  useEffect(() => {
    let ignore = false;

    if (!token) {
      setStatus('failure');
      setVariant('not_found');
      return;
    }

    setStatus('loading');
    setData(null);

    async function validateToken() {
      try {
        const response = await fetch(`${API_BASE}/api/public/join-tokens/${token}`);

        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }

        if (ignore) return;

        if (!response.ok) {
          setStatus('failure');
          setVariant(refusalVariantFor(response.status, body));
          return;
        }

        if (isValidationResponse(body)) {
          setData(body);
          setStatus('success');
        } else {
          setStatus('failure');
          setVariant('not_found');
        }
      } catch {
        if (!ignore) {
          setStatus('failure');
          setVariant('not_found');
        }
      }
    }

    void validateToken();

    return () => {
      ignore = true;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p aria-live="polite" className="text-sm text-gray-500">
          Checking your invitation link…
        </p>
      </div>
    );
  }

  if (status === 'failure') {
    return <RefusalScreen variant={variant} />;
  }

  if (data === null || !token) {
    return <RefusalScreen variant="not_found" />;
  }

  return (
    <Lobby
      token={token}
      interviewTitle={data.interviewTitle}
      recruiterName={data.recruiterName}
      scheduledStart={data.scheduledStart}
      durationMinutes={data.durationMinutes}
    />
  );
}