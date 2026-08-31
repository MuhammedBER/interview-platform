export type PositionStatus = 'ACTIVE' | 'INACTIVE';

export type InterviewStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

// ---- Positions ----

export interface TemplateSegment {
  id: string;
  title: string;
  orderIndex: number;
  plannedMinutes: number;
  defaultQuestions: string[];
}

export interface JobPosition {
  id: string;
  name: string;
  description: string | null;
  status: PositionStatus;
  createdAt: string;
  templates: TemplateSegment[];
}

export interface TemplateSegmentDraft {
  title: string;
  orderIndex: number;
  plannedMinutes: number;
  defaultQuestions: string[];
}

export interface PositionDraft {
  name: string;
  description: string;
  status: PositionStatus;
  templates: TemplateSegmentDraft[];
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

// ---- Interviews ----

export interface InterviewSegment {
  id: string;
  title: string;
  orderIndex: number;
  plannedMinutes: number;
  preparedQuestions: string[];
  actualStart: string | null;
  actualEnd: string | null;
}

export interface Interview {
  id: string;
  recruiterId: string;
  candidateId: string;
  jobPositionId: string | null;
  scheduledStart: string;
  durationMinutes: number;
  status: InterviewStatus;
  admitted: boolean;
  cancelledAt: string | null;
  segments: InterviewSegment[];
}

export interface InterviewListItem {
  id: string;
  title: string | null;
  candidateName: string | null;
  candidateEmail: string | null;
  positionId: string | null;
  positionName: string | null;
  scheduledStart: string;
  durationMinutes: number;
  segmentCount: number;
  status: InterviewStatus;
  admitted: boolean;
}

export interface CandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface SegmentInput {
  title: string;
  orderIndex: number;
  plannedMinutes: number;
  preparedQuestions: string[];
}

export interface ScheduleInterviewInput {
  candidate: CandidateInput;
  jobPositionId: string | null;
  scheduledStart: string;
  durationMinutes: number;
  segments: SegmentInput[];
}

export interface RescheduleInterviewInput {
  scheduledStart: string;
  durationMinutes?: number | null;
}
