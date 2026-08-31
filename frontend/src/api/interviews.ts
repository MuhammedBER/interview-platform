import { api } from '../lib/api';
import type {
  Interview,
  InterviewListItem,
  InterviewStatus,
  RescheduleInterviewInput,
  ScheduleInterviewInput,
} from './types';

export function listInterviews(status?: InterviewStatus, positionId?: string): Promise<InterviewListItem[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (positionId) params.set('positionId', positionId);
  const query = params.toString() ? `?${params.toString()}` : '';
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

export function admitInterview(id: string): Promise<Interview> {
  return api.post<Interview>(`/api/interviews/${id}/admit`);
}

export function markNoShow(id: string): Promise<Interview> {
  return api.post<Interview>(`/api/interviews/${id}/no-show`);
}

export function completeInterview(id: string): Promise<Interview> {
  return api.post<Interview>(`/api/interviews/${id}/complete`);
}

export interface RegenerateLinkResponse {
  joinUrl: string;
}

export function regenerateLink(id: string): Promise<RegenerateLinkResponse> {
  return api.post<RegenerateLinkResponse>(`/api/interviews/${id}/regenerate-link`);
}

export function revokeLink(id: string): Promise<void> {
  return api.post<void>(`/api/interviews/${id}/revoke-link`);
}
