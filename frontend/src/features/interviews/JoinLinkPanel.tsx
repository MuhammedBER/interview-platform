import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { regenerateLink, revokeLink } from '../../api/interviews';
import type { InterviewStatus } from '../../api/types';

interface JoinLinkPanelProps {
  interviewId: string;
  status: InterviewStatus;
  onChanged?: () => void;
}

export default function JoinLinkPanel({ interviewId, status, onChanged }: JoinLinkPanelProps) {
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<'regenerate' | 'revoke' | null>(null);
  const [confirm, setConfirm] = useState<'regenerate' | 'revoke' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (confirm === null) return;

    confirmButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setConfirm(null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirm]);

  function handleActionError(err: unknown) {
    if (err instanceof ApiError) {
      setError(err.message);
      if (err.status === 409) onChanged?.();
    } else {
      setError('Something went wrong.');
    }
  }

  async function handleRegenerate() {
    setBusy('regenerate');
    setError(null);
    setRevoked(false);
    try {
      const response = await regenerateLink(interviewId);
      setJoinUrl(response.joinUrl);
      setConfirm(null);
    } catch (err: unknown) {
      handleActionError(err);
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke() {
    setBusy('revoke');
    setError(null);
    try {
      await revokeLink(interviewId);
      setJoinUrl(null);
      setRevoked(true);
      setConfirm(null);
    } catch (err: unknown) {
      handleActionError(err);
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    if (joinUrl === null) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the link and copy it manually.");
    }
  }

  const actionsDisabled = status !== 'SCHEDULED' || busy !== null;
  const disabledTitle =
    status !== 'SCHEDULED'
      ? `Only available while the interview is SCHEDULED (current: ${status}).`
      : undefined;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Join link</h2>
      <p className="text-sm text-gray-600">
        This link is shown only once and is never stored, so it can't be retrieved later — copy it
        now or regenerate it.
      </p>

      {error !== null ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {revoked && joinUrl === null ? (
        <p className="mt-3 text-xs text-gray-500">The current link has been revoked.</p>
      ) : null}

      {joinUrl !== null ? (
        <div className="mt-4">
          <label
            htmlFor="candidate-join-link"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Candidate join link
          </label>
          <div className="flex items-start gap-2">
            <input
              id="candidate-join-link"
              type="text"
              readOnly
              value={joinUrl}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="shrink-0 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={actionsDisabled}
          title={disabledTitle}
          onClick={() => setConfirm('regenerate')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'regenerate' ? 'Regenerating…' : 'Regenerate link'}
        </button>
        <button
          type="button"
          disabled={actionsDisabled}
          title={disabledTitle}
          onClick={() => setConfirm('revoke')}
          className="rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'revoke' ? 'Revoking…' : 'Revoke link'}
        </button>
      </div>

      {confirm !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-link-dialog-title"
            className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-lg"
          >
            <h3 id="join-link-dialog-title" className="text-lg font-medium text-gray-900">
              {confirm === 'regenerate' ? 'Regenerate link?' : 'Revoke link?'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirm === 'regenerate'
                ? 'Any existing link stops working immediately. A new link will be minted and must be copied now.'
                : "The candidate's current link will stop working."}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                ref={confirmButtonRef}
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  void (confirm === 'regenerate' ? handleRegenerate() : handleRevoke())
                }
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === null ? 'Confirm' : busy === 'regenerate' ? 'Regenerating…' : 'Revoking…'}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setConfirm(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}