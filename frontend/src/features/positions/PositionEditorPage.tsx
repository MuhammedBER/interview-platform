import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SegmentsBuilder, { type SegmentDraft } from '../../components/SegmentsBuilder';
import FieldErrors from '../../components/FieldErrors';
import ErrorBanner from '../../components/ErrorBanner';
import { ApiError, type FieldError } from '../../lib/api';
import { createPosition, getPosition, updatePosition } from '../../api/positions';
import type { PositionDraft, PositionStatus } from '../../api/types';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function fieldMessages(errors: FieldError[], field: string): string[] {
  return errors.filter((e) => e.field === field).map((e) => e.message);
}

export default function PositionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<PositionStatus>('ACTIVE');
  const [segments, setSegments] = useState<SegmentDraft[]>([]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setBanner(null);
    try {
      const position = await getPosition(id);
      setName(position.name);
      setDescription(position.description ?? '');
      setStatus(position.status);
      setSegments(
        position.templates.map((t) => ({
          title: t.title,
          plannedMinutes: t.plannedMinutes,
          questions: t.defaultQuestions.length ? [...t.defaultQuestions] : [''],
        })),
      );
    } catch (err: unknown) {
      setBanner(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function buildDraft(): PositionDraft {
    return {
      name: name.trim(),
      description: description.trim(),
      status,
      templates: segments
        .map((seg, index) => ({
          title: seg.title.trim(),
          orderIndex: index,
          plannedMinutes: seg.plannedMinutes,
          defaultQuestions: seg.questions
            .map((q) => q.trim())
            .filter((q) => q !== ''),
        }))
        .filter((t) => t.title !== '' || t.plannedMinutes > 0),
    };
  }

  async function handleSave() {
    setSaving(true);
    setBanner(null);
    setFieldErrors([]);
    try {
      const draft = buildDraft();
      if (isEdit && id) {
        await updatePosition(id, draft);
      } else {
        await createPosition(draft);
      }
      navigate('/positions');
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

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded border border-gray-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/positions"
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Positions
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEdit ? 'Edit position' : 'New position'}
        </h1>
      </div>

      {banner !== null ? (
        <ErrorBanner onRetry={isEdit && id ? () => void load() : undefined} retrying={loading}>
          {banner}
        </ErrorBanner>
      ) : null}

      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Java Backend Engineer"
            />
            <FieldErrors errors={fieldMessages(fieldErrors, 'name')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as PositionStatus)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Archived (inactive)</option>
            </select>
            <FieldErrors errors={fieldMessages(fieldErrors, 'status')} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
          <textarea
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of the role"
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Segment templates
            <span className="ml-2 font-normal text-gray-500">
              (these are copied into each interview at scheduling time)
            </span>
          </h2>
          <SegmentsBuilder
            segments={segments}
            onChange={setSegments}
            questionLabel="Default questions"
          />
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create position'}
          </button>
          <Link to="/positions" className="text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
