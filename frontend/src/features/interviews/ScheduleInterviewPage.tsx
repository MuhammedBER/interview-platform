import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SegmentsBuilder, { type SegmentDraft } from '../../components/SegmentsBuilder';
import FieldErrors from '../../components/FieldErrors';
import ErrorBanner from '../../components/ErrorBanner';
import { ApiError, type FieldError } from '../../lib/api';
import { listPositions } from '../../api/positions';
import { scheduleInterview } from '../../api/interviews';
import type { JobPosition } from '../../api/types';
import { fromLocalDatetimeValue } from '../../lib/format';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function fieldMessages(errors: FieldError[], field: string): string[] {
  return errors.filter((e) => e.field === field).map((e) => e.message);
}

const ADHOC = 'ADHOC';

export default function ScheduleInterviewPage() {
  const navigate = useNavigate();

  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const [candidate, setCandidate] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [selectedPosition, setSelectedPosition] = useState<string>(ADHOC);
  const [segments, setSegments] = useState<SegmentDraft[]>([]);
  const [scheduledStartLocal, setScheduledStartLocal] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const activePositions = useMemo(
    () => positions.filter((p) => p.status === 'ACTIVE'),
    [positions],
  );

  const loadPositions = useCallback(async () => {
    setPositionsLoading(true);
    setPositionsError(null);
    try {
      setPositions(await listPositions());
    } catch (err: unknown) {
      setPositionsError(toErrorMessage(err));
    } finally {
      setPositionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPositions();
  }, [loadPositions]);

  function handlePositionChange(value: string) {
    setSelectedPosition(value);
    if (value === ADHOC) {
      setSegments([]);
      return;
    }
    const position = positions.find((p) => p.id === value);
    if (!position) {
      setSegments([]);
      return;
    }
    setSegments(
      position.templates.map((t) => ({
        title: t.title,
        plannedMinutes: t.plannedMinutes,
        questions: t.defaultQuestions.length ? [...t.defaultQuestions] : [''],
      })),
    );
  }

  async function handleSubmit() {
    setSaving(true);
    setBanner(null);
    setFieldErrors([]);
    try {
      const jobPositionId = selectedPosition === ADHOC ? null : selectedPosition;
      const interview = await scheduleInterview({
        candidate: {
          firstName: candidate.firstName.trim(),
          lastName: candidate.lastName.trim(),
          email: candidate.email.trim(),
          phone: candidate.phone.trim() === '' ? null : candidate.phone.trim(),
        },
        jobPositionId,
        scheduledStart: fromLocalDatetimeValue(scheduledStartLocal),
        durationMinutes,
        segments: segments.map((seg, index) => ({
          title: seg.title,
          orderIndex: index,
          plannedMinutes: seg.plannedMinutes,
          preparedQuestions: seg.questions.map((q) => q.trim()).filter((q) => q !== ''),
        })),
      });
      navigate(`/interviews/${interview.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors(err.fieldErrors);
        if (err.fieldErrors.length === 0) setBanner(err.message);
      } else {
        setBanner(toErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/interviews" className="text-sm text-gray-500 hover:text-gray-800">
          ← Interviews
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Schedule interview</h1>
      </div>

      {positionsError !== null ? (
        <ErrorBanner onRetry={() => void loadPositions()} retrying={positionsLoading}>
          {positionsError}
        </ErrorBanner>
      ) : null}

      {banner !== null ? (
        <ErrorBanner>{banner}</ErrorBanner>
      ) : null}

      {fieldErrors.length > 0 ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">Please fix the highlighted fields.</p>
          {fieldErrors.map((e) => (
            <p key={e.field} className="mt-0.5">
              {e.field}: {e.message}
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Candidate</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                First name
              </label>
              <input
                className={inputClass}
                value={candidate.firstName}
                onChange={(e) => setCandidate({ ...candidate, firstName: e.target.value })}
              />
              <FieldErrors errors={fieldMessages(fieldErrors, 'candidate.firstName')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Last name</label>
              <input
                className={inputClass}
                value={candidate.lastName}
                onChange={(e) => setCandidate({ ...candidate, lastName: e.target.value })}
              />
              <FieldErrors errors={fieldMessages(fieldErrors, 'candidate.lastName')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                className={inputClass}
                value={candidate.email}
                onChange={(e) => setCandidate({ ...candidate, email: e.target.value })}
              />
              <FieldErrors errors={fieldMessages(fieldErrors, 'candidate.email')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Phone <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                className={inputClass}
                value={candidate.phone}
                onChange={(e) => setCandidate({ ...candidate, phone: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Scheduling</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Position</label>
              <select
                className={inputClass}
                value={selectedPosition}
                onChange={(e) => handlePositionChange(e.target.value)}
                disabled={positionsLoading}
              >
                <option value={ADHOC}>Ad-hoc (no position)</option>
                {activePositions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Selecting a position copies its segments below for you to adjust.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Scheduled start
              </label>
              <input
                type="datetime-local"
                className={inputClass}
                value={scheduledStartLocal}
                onChange={(e) => setScheduledStartLocal(e.target.value)}
              />
              <FieldErrors errors={fieldMessages(fieldErrors, 'scheduledStart')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Duration (minutes)
              </label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
              <FieldErrors errors={fieldMessages(fieldErrors, 'durationMinutes')} />
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Interview segments</h2>
          <p className="mb-3 text-xs text-gray-500">
            {selectedPosition === ADHOC
              ? 'Build the interview structure manually — at least one segment is required.'
              : 'Copied from the selected position. Edit and reorder freely — the position itself is not changed.'}
          </p>
          <SegmentsBuilder
            segments={segments}
            onChange={setSegments}
            questionLabel="Prepared questions"
          />
          {selectedPosition === ADHOC && segments.length === 0 ? (
            <p className="mt-2 text-xs text-amber-600">
              An ad-hoc interview must include at least one segment.
            </p>
          ) : null}
        </section>

        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Scheduling…' : 'Schedule interview'}
          </button>
          <Link to="/interviews" className="text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
