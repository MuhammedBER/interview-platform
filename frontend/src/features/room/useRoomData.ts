import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../lib/api';
import { getRoom } from './api';
import type { RoomResponse } from './types';

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : 'Something went wrong loading the room.';
  return new ApiError(0, message);
}

/**
 * Holds the recruiter room bootstrap and refetches it on demand.
 * The room object is never mutated in place; every refetch replaces it with a
 * fresh server response so actualStart/actualEnd and status stay authoritative.
 */
export function useRoomData(interviewId: string) {
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoom(await getRoom(interviewId));
    } catch (err: unknown) {
      setError(toApiError(err));
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { room, loading, error, refetch };
}
