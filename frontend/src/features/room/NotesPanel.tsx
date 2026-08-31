import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ApiError } from '../../lib/api';
import { createNote, getNotes } from './api';
import { formatDateTime, formatDuration } from '../../lib/format';
import type { RoomNote, RoomSegment } from './types';

interface NotesPanelProps {
  interviewId: string;
  currentSegment: RoomSegment | null;
}

/**
 * A note that is being optimistically submitted. The server `RoomNote.id` does
 * not exist until the POST returns, so each entry carries its own client-only
 * identity (`clientId`) that is never sent to the backend. Until the server
 * responds, `saved` is null and no authoritative timestamps are shown.
 */
interface PendingNote {
  clientId: string;
  content: string;
  segmentId: string | null;
  saved: RoomNote | null;
}

let tempCounter = 0;
function nextClientId(): string {
  tempCounter += 1;
  return `note-${Date.now()}-${tempCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return new ApiError(0, message);
}

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again to continue.';

export default function NotesPanel({ interviewId, currentSegment }: NotesPanelProps) {
  const [input, setInput] = useState('');
  const [serverNotes, setServerNotes] = useState<RoomNote[]>([]);
  const [pending, setPending] = useState<PendingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const fetched = await getNotes(interviewId);
      // A resolved optimistic note is kept at the top of `pending`; drop it from
      // the freshly fetched server list so it is not duplicated.
      const resolvedIds = new Set(
        pending.filter((p) => p.saved !== null).map((p) => p.saved!.id),
      );
      setServerNotes(fetched.filter((n) => !resolvedIds.has(n.id)));
    } catch (err) {
      // Never erase notes already shown when a later GET fails.
      setLoadError(toApiError(err));
    } finally {
      setLoading(false);
    }
    // `pending` is read via the functional form below; the dependency is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Newest first: pending optimistic notes on top, then server notes (the API
  // returns them ascending) reversed so the newest is at the top.
  const displayNotes = useMemo(() => {
    return [...pending, ...serverNotes.slice().reverse()];
  }, [pending, serverNotes]);

  async function submit(capturedText: string, segmentId: string | null) {
    const clientId = nextClientId();
    setInput('');
    setPostError(null);
    setPending((prev) => [{ clientId, content: capturedText, segmentId, saved: null }, ...prev]);

    try {
      const saved = await createNote(interviewId, { content: capturedText, segmentId });
      setPending((prev) =>
        prev.map((p) => (p.clientId === clientId ? { ...p, saved } : p)),
      );
    } catch (err) {
      setPending((prev) => prev.filter((p) => p.clientId !== clientId));
      const apiError = toApiError(err);
      setPostError(apiError.status === 401 ? SESSION_EXPIRED_MESSAGE : apiError.message);
      // Restore the captured text only if the user has not already typed newer
      // input into the field since it was cleared.
      if ((inputRef.current?.value ?? '') === '') {
        setInput(capturedText);
      }
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const current = inputRef.current?.value ?? input;
    if (current.trim() === '') return;
    event.preventDefault();
    void submit(current, currentSegment?.id ?? null);
  }

  function renderList() {
    if (loading && serverNotes.length === 0 && pending.length === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-4" aria-busy="true">
          <p className="text-sm text-gray-500">Loading notes…</p>
        </div>
      );
    }

    if (loadError !== null) {
      return (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
          <p className="text-sm text-red-700">
            {loadError.status === 401 ? SESSION_EXPIRED_MESSAGE : loadError.message}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Retry
          </button>
        </div>
      );
    }

    if (displayNotes.length === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">No notes yet</p>
        </div>
      );
    }

    return (
      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {displayNotes.map((entry) => {
          if ('clientId' in entry && entry.saved === null) {
            return (
              <li
                key={entry.clientId}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {entry.content}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">Saving…</span>
                </div>
              </li>
            );
          }
          const resolved = 'saved' in entry ? entry.saved! : entry;
          return (
            <li
              key={'saved' in entry ? `pending-${entry.clientId}` : resolved.id}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {resolved.content}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-gray-400">
                  {formatDateTime(resolved.createdAt)}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatDuration(resolved.elapsedSeconds)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="flex min-h-0 flex-col space-y-3">
      <h2 className="text-lg font-medium text-gray-900">Notes</h2>

      <div>
        <label
          htmlFor={`note-${interviewId}`}
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Add a note
        </label>
        <input
          id={`note-${interviewId}`}
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a note and press Enter"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {postError !== null ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {postError}
        </div>
      ) : null}

      {renderList()}
    </section>
  );
}
