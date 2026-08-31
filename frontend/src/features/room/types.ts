import type { InterviewStatus } from '../../api/types';

export interface RoomInterviewSummary {
  id: string;
  recruiterId: string;
  candidateId: string;
  jobPositionId: string | null;
  scheduledStart: string;
  durationMinutes: number;
  status: InterviewStatus;
  admitted: boolean;
  cancelledAt: string | null;
  candidateWaitingSince: string | null;
  candidateName: string | null;
  candidateEmail: string | null;
  positionName: string | null;
  title: string | null;
  segments: RoomSegment[];
}

export interface RoomSegment {
  id: string;
  title: string;
  orderIndex: number;
  plannedMinutes: number;
  preparedQuestions: string[];
  actualStart: string | null;
  actualEnd: string | null;
}

export interface RoomNote {
  id: string;
  interviewId: string;
  segmentId: string | null;
  content: string;
  elapsedSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomResponse {
  interview: RoomInterviewSummary;
  segments: RoomSegment[];
  currentSegment: RoomSegment | null;
  notes: RoomNote[];
}

export interface WaitingStatus {
  admitted: boolean;
  candidateWaitingSince: string | null;
  waiting: boolean;
}

export interface CreateNoteRequest {
  content: string;
  segmentId: string | null;
}

export interface VideoTokenResponse {
  appId: number;
  token: string;
  roomId: string;
  userId: string;
  userName: string;
  expiresInSeconds: number;
}

export type RoomStatus =
  | 'checking'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'left';
