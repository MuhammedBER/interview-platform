import type { RoomInterviewSummary, RoomSegment } from './types';
import StatusBadge from '../../components/StatusBadge';
import { formatDateTime } from '../../lib/format';
import SegmentTimer from './SegmentTimer';
import SegmentList from './SegmentList';
import PreparedQuestions from './PreparedQuestions';
import NotesPanel from './NotesPanel';

interface CockpitPanelProps {
  interview: RoomInterviewSummary;
  segments: RoomSegment[];
  currentSegment: RoomSegment | null;
  refetch: () => Promise<void>;
}

/**
 * Right-hand cockpit of the recruiter room. Shows the interview summary
 * (candidate, position, schedule) and the live session panels: timer, segments,
 * prepared questions and notes. Panels receive the authoritative room bootstrap
 * from the parent plus a single shared `refetch` for post-write refresh.
 */
export default function CockpitPanel({
  interview,
  segments,
  currentSegment,
  refetch,
}: CockpitPanelProps) {
  const candidateLabel = interview.candidateName?.trim() || interview.candidateId;

  return (
    <div className="flex h-full w-[380px] flex-col space-y-6 overflow-y-auto bg-white p-6">
      <section className="space-y-3" aria-label="Interview summary">
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-lg font-medium text-gray-900">Interview Room</h2>
          <StatusBadge status={interview.status} />
        </div>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-gray-500">Candidate</dt>
            <dd className="mt-0.5 truncate text-sm text-gray-900">{candidateLabel}</dd>
          </div>
          {interview.positionName ? (
            <div>
              <dt className="text-xs text-gray-500">Position</dt>
              <dd className="mt-0.5 truncate text-sm text-gray-900">{interview.positionName}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-gray-500">Scheduled</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {formatDateTime(interview.scheduledStart)} · {interview.durationMinutes} min
            </dd>
          </div>
        </dl>
      </section>

      <SegmentTimer currentSegment={currentSegment} segments={segments} />
      <SegmentList
        interviewId={interview.id}
        segments={segments}
        currentSegment={currentSegment}
        onRefetch={refetch}
      />
      <PreparedQuestions currentSegment={currentSegment} />
      <NotesPanel interviewId={interview.id} currentSegment={currentSegment} />
    </div>
  );
}
