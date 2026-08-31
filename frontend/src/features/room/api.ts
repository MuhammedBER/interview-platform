import { API_BASE, api, ApiError } from '../../lib/api';
import type {
  CreateNoteRequest,
  RoomNote,
  RoomResponse,
  VideoTokenResponse,
  WaitingStatus,
} from './types';

export interface CandidateVideoTokenRequest {
  joinToken: string;
}

export function getRoom(interviewId: string): Promise<RoomResponse> {
  return api.get<RoomResponse>(`/api/interviews/${interviewId}/room`);
}

export function getRecruiterVideoToken(interviewId: string): Promise<VideoTokenResponse> {
  return api.post<VideoTokenResponse>(`/api/interviews/${interviewId}/video-token`);
}

/**
 * Candidate token fetch. This intentionally bypasses the authenticated `api`
 * wrapper and hits the public endpoint directly with no Bearer header: the
 * wrapper calls `updateToken()` which rejects when no Keycloak session exists,
 * and the candidate has none. Mirrors the JoinPage public-fetch precedent.
 *
 * 403 = not admitted yet (retryable, waiting room)
 * 401 = invalid/revoked/used/expired/outside-window token (terminal)
 * 409 = interview cancelled/completed (terminal)
 */
export async function getCandidateVideoToken(joinToken: string): Promise<VideoTokenResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/public/video-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinToken } satisfies CandidateVideoTokenRequest),
    });
  } catch {
    throw new ApiError(0, 'Network error while reaching the interview service.');
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let message = '';
    try {
      const parsed = raw ? (JSON.parse(raw) as { message?: unknown }) : null;
      if (parsed && typeof parsed.message === 'string') {
        message = parsed.message;
      }
    } catch {
      message = '';
    }
    throw new ApiError(response.status, message || `Request failed (${response.status}).`);
  }

  return (await response.json()) as VideoTokenResponse;
}

export function admitCandidate(interviewId: string): Promise<RoomResponse> {
  return api.post<RoomResponse>(`/api/interviews/${interviewId}/admit`);
}

export function getWaitingStatus(interviewId: string): Promise<WaitingStatus> {
  return api.get<WaitingStatus>(`/api/interviews/${interviewId}/waiting-status`);
}

export function getNotes(interviewId: string): Promise<RoomNote[]> {
  return api.get<RoomNote[]>(`/api/interviews/${interviewId}/notes`);
}

export function createNote(interviewId: string, body: CreateNoteRequest): Promise<RoomNote> {
  return api.post<RoomNote>(`/api/interviews/${interviewId}/notes`, body);
}

export function startInterview(interviewId: string): Promise<void> {
  return api.post(`/api/interviews/${interviewId}/start`);
}

export function completeInterview(interviewId: string): Promise<void> {
  return api.post(`/api/interviews/${interviewId}/complete`);
}

export function startSegment(interviewId: string, segmentId: string): Promise<void> {
  return api.post(`/api/interviews/${interviewId}/segments/${segmentId}/start`);
}

export function endSegment(interviewId: string, segmentId: string): Promise<void> {
  return api.post(`/api/interviews/${interviewId}/segments/${segmentId}/end`);
}
