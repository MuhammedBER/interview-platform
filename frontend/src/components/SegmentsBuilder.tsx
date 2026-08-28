export interface SegmentDraft {
  title: string;
  plannedMinutes: number;
  questions: string[];
}

interface SegmentsBuilderProps {
  segments: SegmentDraft[];
  onChange: (segments: SegmentDraft[]) => void;
  questionLabel: string;
}

export default function SegmentsBuilder({
  segments,
  onChange,
  questionLabel,
}: SegmentsBuilderProps) {
  function updateSegment(index: number, patch: Partial<SegmentDraft>) {
    const next = segments.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  }

  function addSegment() {
    onChange([...segments, { title: '', plannedMinutes: 10, questions: [''] }]);
  }

  function removeSegment(index: number) {
    onChange(segments.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= segments.length) return;
    const next = [...segments];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  function updateQuestion(segIndex: number, qIndex: number, value: string) {
    const seg = segments[segIndex];
    const questions = seg.questions.map((q, i) => (i === qIndex ? value : q));
    updateSegment(segIndex, { questions });
  }

  function addQuestion(segIndex: number) {
    const seg = segments[segIndex];
    updateSegment(segIndex, { questions: [...seg.questions, ''] });
  }

  function removeQuestion(segIndex: number, qIndex: number) {
    const seg = segments[segIndex];
    updateSegment(segIndex, {
      questions: seg.questions.filter((_, i) => i !== qIndex),
    });
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-4">
      {segments.length === 0 ? (
        <p className="text-sm text-gray-500">No segments yet. Add one below.</p>
      ) : (
        segments.map((seg, segIndex) => (
          <div key={segIndex} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Segment {segIndex + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(segIndex, -1)}
                  disabled={segIndex === 0}
                  className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move segment up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(segIndex, 1)}
                  disabled={segIndex === segments.length - 1}
                  className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move segment down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeSegment(segIndex)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Title
                </label>
                <input
                  className={inputClass}
                  value={seg.title}
                  onChange={(e) => updateSegment(segIndex, { title: e.target.value })}
                  placeholder="e.g. Core Java Deep Dive"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Minutes
                </label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={seg.plannedMinutes}
                  onChange={(e) =>
                    updateSegment(segIndex, { plannedMinutes: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-600">{questionLabel}</p>
              <div className="space-y-2">
                {seg.questions.map((question, qIndex) => (
                  <div key={qIndex} className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      value={question}
                      onChange={(e) => updateQuestion(segIndex, qIndex, e.target.value)}
                      placeholder={`Question ${qIndex + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(segIndex, qIndex)}
                      aria-label="Remove question"
                      className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      −
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addQuestion(segIndex)}
                className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                + Add question
              </button>
            </div>
          </div>
        ))
      )}

      <button
        type="button"
        onClick={addSegment}
        className="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
      >
        + Add segment
      </button>
    </div>
  );
}
