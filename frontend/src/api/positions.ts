import { api } from '../lib/api';
import type { JobPosition, Organization, PositionDraft } from './types';

export function listPositions(): Promise<JobPosition[]> {
  return api.get<JobPosition[]>('/api/positions');
}

export function getPosition(id: string): Promise<JobPosition> {
  return api.get<JobPosition>(`/api/positions/${id}`);
}

export function createPosition(draft: PositionDraft): Promise<JobPosition> {
  return api.post<JobPosition>('/api/positions', draft);
}

export function updatePosition(id: string, draft: PositionDraft): Promise<JobPosition> {
  return api.put<JobPosition>(`/api/positions/${id}`, draft);
}

export function getCurrentOrganization(): Promise<Organization> {
  return api.get<Organization>('/api/organizations/current');
}
