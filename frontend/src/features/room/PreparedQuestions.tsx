import { useEffect, useState } from 'react';
import type { RoomSegment } from './types';

interface PreparedQuestionsProps {
  /** The current interview segment, or null when none is active. */
  currentSegment: RoomSegment | null;
}

/**
 * Recruiter cockpit panel showing the current segment's `preparedQuestions` for
 * comfortable reading while on camera. Each question has a one-click
 * "Mark asked" toggle that is purely local UI state — it is never persisted to
 * the backend and never sent through the fetch wrapper. Local state is reset
 * whenever the `currentSegment` changes so the previous segment's marks never
 * carry over.
 */
export default function PreparedQuestions({ currentSegment }: PreparedQuestionsProps) {
  const [askedIndices, setAskedIndices] = useState<ReadonlySet<number>>(new Set());

  const currentSegmentId = currentSegment?.id ?? null;

  // Reset local asked state when the active segment changes.
  useEffect(() => {
    setAskedIndices(new Set());
  }, [currentSegmentId]);

  function toggleAsked(index: number) {
    setAskedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  if (currentSegment === null) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Prepared questions</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">No active segment</p>
        </div>
      </section>
    );
  }

  const questions = currentSegment.preparedQuestions;

  return (
    <section className="flex min-h-0 flex-col space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-gray-900">Prepared questions</h2>
        <p className="truncate text-xs text-gray-500">{currentSegment.title}</p>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">No prepared questions</p>
        </div>
      ) : (
        <ol className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {questions.map((question, index) => {
            const asked = askedIndices.has(index);
            return (
              <li key={index} className="flex items-start justify-between gap-3 px-4 py-3">
                <p
                  className={`min-w-0 flex-1 text-sm leading-relaxed ${
                    asked ? 'text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {index + 1}. {question}
                </p>
                <button
                  type="button"
                  onClick={() => toggleAsked(index)}
                  aria-pressed={asked}
                  aria-label={`${asked ? 'Mark' : 'Mark'} question ${index + 1} as ${
                    asked ? 'not asked' : 'asked'
                  }: ${question}`}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    asked
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-white text-blue-600 ring-1 ring-inset ring-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {asked ? 'Asked' : 'Mark asked'}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
