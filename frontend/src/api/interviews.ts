import { api } from '../lib/api';
import type {
  Interview,
  InterviewListItem,
  InterviewStatus,
  RescheduleInterviewInput,
  ScheduleInterviewInput,
} from './types';

export function listInterviews(status?: InterviewStatus): Promise<InterviewListItem[]> {
  const query = status ? `?status=${status}` : '';
  return api.get<InterviewListItem[]>(`/api/interviews${query}`);
}

export function getInterview(id: string): Promise<Interview> {
  return api.get<Interview>(`/api/interviews/${id}`);
}

export function scheduleInterview(input: ScheduleInterviewInput): Promise<Interview> {
  return api.post<Interview>('/api/interviews', input);
}

export function rescheduleInterview(id: string, input: RescheduleInterviewInput): Promise<Interview> {
  return api.post<Interview>(`/api/interviews/${id}/reschedule`, input);
}

export function cancelInterview(id: string): Promise<Interview> {
  return api.post<Interview>(`/api/interviews/${id}/cancel`);
}

export function markNoShow(id: string): Promise<Interview> {
  return api.post<Interview>(`/api/interviews/${id}/no-show`);
}

export function completeInterview(id: string): Promise<Interview> {
  return api.post<Interview>(`/api/interviews/${id}/complete`);
}
