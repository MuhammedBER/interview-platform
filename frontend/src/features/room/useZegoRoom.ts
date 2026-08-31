import { useCallback, useEffect, useRef, useState } from 'react';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import { ApiError } from '../../lib/api';
import type { VideoTokenResponse } from './types';

const WAIT_RETRY_MS = 4000;
const VIDEO_QUALITY = 2;

const ROOM_REASON_LOGIN_FAILED = 'LOGIN_FAILED';
const ROOM_REASON_RECONNECT_FAILED = 'RECONNECT_FAILED';
const ROOM_REASON_KICKOUT = 'KICKOUT';
const ROOM_REASON_LOGOUT_FAILED = 'LOGOUT_FAILED';

/** Which participant this hook instance represents inside the interview room. */
export type ZegoRoomRole = 'recruiter' | 'candidate';

export interface UseZegoRoomOptions {
  /**
   * Supplies the ZEGO video token for the current participant.
   *
   * Role is decided here, by the page, using the repo's existing convention:
   * the candidate page passes `getCandidateVideoToken(joinToken)` (public
   * `POST /api/public/video-token`, no bearer) and the recruiter page passes
   * `getRecruiterVideoToken(interviewId)` (authenticated
   * `POST /api/interviews/{id}/video-token`). The hook itself stays role
   * agnostic and simply invokes the provided fetcher whenever it needs a token.
   */
  fetchToken: () => Promise<VideoTokenResponse>;
  /**
   * This participant's role. Used to build the deterministic publish stream id
   * `<interviewId>-recruiter` / `<interviewId>-candidate`, and to decide
   * whether a 403 from the token fetch is retryable (candidate not yet
   * admitted) or terminal.
   */
  role: ZegoRoomRole;
}

/** A remote participant's stream, keyed by the SDK's stream ID. */
export interface ActiveRemoteStream {
  streamID: string;
  userID: string;
  stream: MediaStream;
}

export interface UseZegoRoomState {
  /** The actively published local stream (MediaStream from `createStream`). */
  localStream: MediaStream | null;
  /** Remote streams currently being played, keyed by `streamID`. */
  remoteStreams: ActiveRemoteStream[];
  /** True only after `loginRoom` has succeeded; false before, and after leave/cleanup. */
  joined: boolean;
  /** Human-readable failure message, or null while healthy. Never contains credentials. */
  error: string | null;
  /**
   * True while this participant's camera is actively publishing video. Mirrors
   * the ZEGO publish-stream video state and is only flipped when the SDK
   * confirms the operation succeeded. False before joining, after leave/
   * cleanup, and when a camera toggle fails.
   */
  cameraOn: boolean;
  /**
   * True while this participant's microphone is actively publishing audio.
   * Mirrors the ZEGO publish-stream audio state and is only flipped when the
   * SDK confirms `mutePublishStreamAudio` succeeded. False before joining,
   * after leave/cleanup, and when a mic toggle fails. This drives both the SDK
   * mute/unmute call and the "Mute"/"Unmute" button. It is fully independent of
   * `cameraOn`: toggling one never affects the other track or its state.
   */
  micOn: boolean;
  /**
   * Mute/unmute the local microphone on the publishing stream via the SDK's
   * `mutePublishStreamAudio`, committing `micOn` only on SDK-confirmed success.
   */
  mute: () => void;
  /** Toggles the local camera off/on via the ZEGO publish-stream video API. */
  toggleCamera: () => void;
  /** Leaves the room and releases the engine, streams and media tracks. */
  leave: () => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'This invitation link is no longer valid or has expired.';
      case 409:
        return 'This interview has been cancelled or completed.';
      default:
        return error.message.trim() !== '' ? error.message : 'Unable to join the call.';
    }
  }
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }
  return 'Unable to join the call.';
}

/** Console breadcrumb so the join sequence can be traced exactly where it stops. */
function logBreadcrumb(message: string): void {
  console.log(`[zego-room] ${message}`);
}

/** Single, consistent console.error prefix for every failure path. */
function logError(context: string, detail?: unknown): void {
  console.error(`[zego-room] ${context}`, detail ?? '');
}

/**
 * Owns the ZEGO Express engine for a one-on-one interview call (recruiter and
 * candidate share this exact hook; the page supplies `fetchToken` and `role`).
 *
 * Canonical join sequence (both roles):
 * 1. fetch video token (candidate token retries on 403 until admitted)
 * 2. create engine (`new ZegoExpressEngine(token.appId, server)`)
 * 3. checkSystemRequirements('webRTC'); unsupported -> clear error, stop
 * 4. register `roomStreamUpdate` / `roomStateChanged` / `publisherStateUpdate`
 *    / `playerStateUpdate` / `tokenWillExpire` BEFORE login
 * 5. loginRoom(roomId = token.roomId, token.token, { userID: token.userId, userName })
 * 6. createStream(camera video + audio), attach to the local tile immediately
 * 7. startPublishingStream(`<roomId>-<role>`, local) and play remote streams as
 *    the SDK announces them.
 *
 * ZEGO tokens are minted with a TTL, bound to the backend-issued `userId` (see
 * `VideoTokenService` / `TokenServerAssistant`, which embeds `user_id` in the
 * token), so the room `userID` must be `token.userId` on both sides. The room
 * ID in the token is the interview id, identical for recruiter and candidate,
 * which is what lets the two participants ever see each other. Stream IDs are
 * deterministic per role but never collide between the two participants.
 *
 * React 18 StrictMode (dev) runs effect setup -> cleanup -> setup. A ref guard
 * prevents a second engine/join while one cycle is already live, and each
 * cycle's `isCancelled` flag stops stale async token/stream work (and stale
 * event callbacks) from touching state after its cleanup has run.
 */
export function useZegoRoom({ fetchToken, role }: UseZegoRoomOptions): UseZegoRoomState {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<ActiveRemoteStream[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  const joinedRef = useRef(false);
  const engineRef = useRef<ZegoExpressEngine | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<ActiveRemoteStream[]>([]);
  const roomIdRef = useRef('');
  const publishStreamIDRef = useRef<string | null>(null);
  const micMutedRef = useRef(false);
  // `cameraMutedRef` follows the SDK's mute semantics: true = not publishing
  // video, false = publishing. The exposed `cameraOn` state is its inverse and
  // is updated together with it only on confirmed SDK success.
  const cameraMutedRef = useRef(true);

  const teardown = useCallback(() => {
    const engine = engineRef.current;

    for (const remote of remoteStreamsRef.current) {
      try {
        engine?.stopPlayingStream(remote.streamID);
      } catch {
        // ignore teardown errors
      }
    }
    remoteStreamsRef.current = [];

    const publishStreamID = publishStreamIDRef.current;
    if (publishStreamID) {
      try {
        engine?.stopPublishingStream(publishStreamID);
      } catch {
        // ignore teardown errors
      }
    }
    publishStreamIDRef.current = null;

    const local = localStreamRef.current;
    if (local) {
      try {
        engine?.destroyStream(local);
      } catch {
        // ignore teardown errors
      }
      local.getTracks().forEach((track) => track.stop());
    }
    localStreamRef.current = null;

    if (engine) {
      // Remove every handler this hook registered on this engine, then leave
      // and free the instance. All wrapped so repeat calls stay safe.
      const events = [
        'roomStreamUpdate',
        'roomStateChanged',
        'publisherStateUpdate',
        'playerStateUpdate',
        'tokenWillExpire',
      ] as const;
      for (const event of events) {
        try {
          engine.off(event);
        } catch {
          // ignore teardown errors
        }
      }
      try {
        engine.logoutRoom(roomIdRef.current);
      } catch {
        // ignore teardown errors
      }
      try {
        engine.destroyEngine();
      } catch {
        // ignore teardown errors
      }
    }
    engineRef.current = null;
    roomIdRef.current = '';
    micMutedRef.current = false;
    cameraMutedRef.current = true;
    setCameraOn(false);
    setMicOn(false);

    joinedRef.current = false;
    setLocalStream(null);
    setRemoteStreams([]);
    setJoined(false);
  }, []);

  useEffect(() => {
    if (joinedRef.current) {
      return;
    }
    joinedRef.current = true;

    let isCancelled = false;
    let roomId = '';

    const hookTeardown = () => {
      isCancelled = true;
      teardown();
    };

    async function runJoin() {
      try {
        setError(null);

        const server = (import.meta.env.VITE_ZEGO_SERVER ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (server.length === 0) {
          setError('Video calling is not configured. Please contact the interviewer.');
          logError('no VITE_ZEGO_SERVER configured');
          hookTeardown();
          return;
        }

        let token: VideoTokenResponse;
        for (;;) {
          try {
            token = await fetchToken();
            break;
          } catch (err) {
            const apiError = err instanceof ApiError ? err : null;
            // Only the candidate's public token expects a 403 as the
            // "not admitted yet" state (retryable). For the recruiter any token
            // failure is terminal and falls through to the error handler.
            const retryable = role === 'candidate' && apiError?.status === 403;
            if (!retryable) {
              throw err;
            }
            logBreadcrumb('candidate not yet admitted; retrying token fetch in 4s');
            await delay(WAIT_RETRY_MS);
            if (isCancelled) return;
          }
        }
        if (isCancelled) return;

        // roomId comes from the token: it is the interview id, identical for
        // the recruiter and the candidate. This is what joins both into the
        // same ZEGO room. The stream id is deterministic per role.
        roomId = token.roomId;
        roomIdRef.current = roomId;
        const publishStreamID = `${roomId}-${role}`;
        publishStreamIDRef.current = publishStreamID;

        const engineInstance = new ZegoExpressEngine(token.appId, server);
        engineRef.current = engineInstance;
        logBreadcrumb('engine created');

        let capability;
        try {
          capability = await engineInstance.checkSystemRequirements('webRTC');
        } catch (err) {
          if (isCancelled) return;
          setError('Unable to check your browser video support.');
          logError('checkSystemRequirements threw', err);
          hookTeardown();
          return;
        }
        if (isCancelled) return;
        if (capability.result === false || capability.webRTC === false) {
          setError(
            'Video calling is not available in this browser or context. Open the call on a ' +
              'recent Chrome/Firefox/Edge at https:// or http://127.0.0.1/localhost and allow camera ' +
              'and microphone access.'
          );
          logError('checkSystemRequirements reported webRTC unsupported', capability);
          hookTeardown();
          return;
        }

        engineInstance.on('roomStreamUpdate', (streamRoomID, updateType, streamList) => {
          if (isCancelled || streamRoomID !== roomId) return;
          for (const stream of streamList) {
            if (stream.user?.userID === token.userId) continue;
            if (updateType === 'ADD') {
              logBreadcrumb(`remote ADD ${stream.streamID}`);
              void (async () => {
                if (isCancelled) return;
                try {
                  const remote = await engineInstance.startPlayingStream(stream.streamID, {
                    video: true,
                    audio: true,
                  });
                  if (isCancelled) return;
                  if (remoteStreamsRef.current.some((r) => r.streamID === stream.streamID)) {
                    return;
                  }
                  logBreadcrumb(`playing remote ${stream.streamID}`);
                  const entry: ActiveRemoteStream = {
                    streamID: stream.streamID,
                    userID: stream.user?.userID ?? '',
                    stream: remote,
                  };
                  remoteStreamsRef.current = [...remoteStreamsRef.current, entry];
                  setRemoteStreams(remoteStreamsRef.current);
                } catch (err) {
                  logError(`failed to startPlayingStream ${stream.streamID}`, err);
                  if (!isCancelled) {
                    setError('Failed to receive the other person\u2019s video.');
                  }
                }
              })();
            } else {
              try {
                engineInstance.stopPlayingStream(stream.streamID);
              } catch {
                // ignore
              }
              remoteStreamsRef.current = remoteStreamsRef.current.filter(
                (r) => r.streamID !== stream.streamID
              );
              setRemoteStreams(remoteStreamsRef.current);
            }
          }
        });

        engineInstance.on('roomStateChanged', (streamRoomID, reason, errorCode) => {
          if (isCancelled || streamRoomID !== roomId) return;
          const reasonName = String(reason);
          if (
            reasonName === ROOM_REASON_LOGIN_FAILED ||
            reasonName === ROOM_REASON_RECONNECT_FAILED ||
            reasonName === ROOM_REASON_KICKOUT ||
            reasonName === ROOM_REASON_LOGOUT_FAILED
          ) {
            if (errorCode !== 0 || reasonName === ROOM_REASON_KICKOUT) {
              setError('The connection to the call was lost or rejected.');
              logError('roomStateChanged', { reason: reasonName, errorCode });
              hookTeardown();
            }
          }
        });

        engineInstance.on('publisherStateUpdate', (result) => {
          if (isCancelled) return;
          if (result.errorCode !== 0 && result.state === 'NO_PUBLISH') {
            setError('Failed to publish your video. Check your camera and microphone permissions.');
            logError('publisherStateUpdate', result);
            hookTeardown();
          }
        });

        engineInstance.on('playerStateUpdate', (result) => {
          if (isCancelled) return;
          if (result.errorCode !== 0) {
            setError(`Failed to play the remote stream: ${String(result.streamID)}`);
            logError('playerStateUpdate', result);
          }
        });

        engineInstance.on('tokenWillExpire', (streamRoomID) => {
          if (isCancelled || streamRoomID !== roomId) return;
          void (async () => {
            if (isCancelled) return;
            try {
              const fresh = await fetchToken();
              if (isCancelled) return;
              const renewed = engineInstance.renewToken(fresh.token, roomId);
              if (!renewed) {
                setError('Video session expired. Please reconnect.');
                logError('renewToken returned false; reconnect needed');
                hookTeardown();
              }
            } catch (err) {
              if (isCancelled) return;
              setError('Video session expired. Please reconnect.');
              logError('tokenWillExpire renew failed', err);
              hookTeardown();
            }
          })();
        });

        // loginRoom must use the exact userId the backend embedded in this
        // participant's token, otherwise the token fails validation.
        let loginOk: boolean;
        try {
          loginOk = await engineInstance.loginRoom(roomId, token.token, {
            userID: token.userId,
            userName: token.userName,
          });
        } catch (err) {
          loginOk = false;
          logError('loginRoom threw', err);
        }
        if (isCancelled) return;
        if (!loginOk) {
          setError('Unable to join the call room. Please try again.');
          logError(`loginRoom failed room=${roomId} user=${token.userId}`);
          hookTeardown();
          return;
        }
        logBreadcrumb(`logged in room ${roomId} as ${token.userId}`);

        setJoined(true);

        let stream: MediaStream;
        try {
          stream = await engineInstance.createStream({
            camera: { video: true, audio: true, videoQuality: VIDEO_QUALITY },
          });
        } catch (err) {
          if (isCancelled) return;
          setError('Camera or microphone access was denied. Allow both and try again.');
          logError('createStream/getUserMedia denied', err);
          hookTeardown();
          return;
        }
        if (isCancelled) return;

        // Attach the local preview immediately, before any remote arrives, so
        // each side sees their own camera straight away.
        localStreamRef.current = stream;
        publishStreamIDRef.current = publishStreamID;
        setLocalStream(stream);

        // The fresh stream is created with microphone audio and camera video
        // enabled, so publishing turns both on. Mirror the muted refs so the
        // first toggle of each turns that one track off independently.
        cameraMutedRef.current = false;
        setCameraOn(true);
        micMutedRef.current = false;
        setMicOn(true);

        logBreadcrumb(`publishing ${publishStreamID}`);
        const published = engineInstance.startPublishingStream(publishStreamID, stream);
        if (!published) {
          setError('Failed to start your video. Please try again.');
          logError(`startPublishingStream failed for ${publishStreamID}`);
          hookTeardown();
          return;
        }
      } catch (err) {
        if (isCancelled) return;
        setError(toErrorMessage(err));
        logError('join failed', err);
        hookTeardown();
      }
    }

    void runJoin();

    return () => {
      hookTeardown();
    };
  }, [fetchToken, teardown, role]);

  const mute = useCallback(() => {
    const engine = engineRef.current;
    const local = localStreamRef.current;
    if (!engine || !local || micMutedRef.current === undefined) return;
    const next = !micMutedRef.current;
    try {
      // Audio equivalent of the camera toggle below: mute/unmute the audio of
      // the LOCAL publish stream so the remote participant actually stops
      // hearing this side — not just a local boolean. Commit state only when
      // the SDK confirms the operation succeeded, exactly like
      // `mutePublishStreamVideo`/`toggleCamera`.
      const applied = engine.mutePublishStreamAudio(local, next);
      if (!applied) {
        setError('Unable to toggle your microphone. Please try again.');
        return;
      }
      micMutedRef.current = next;
      setMicOn(!next);
      logBreadcrumb(next ? 'microphone muted' : 'microphone unmuted');
    } catch {
      setError('Unable to toggle your microphone. Please try again.');
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const engine = engineRef.current;
    const local = localStreamRef.current;
    if (!engine || !local || cameraMutedRef.current === undefined) return;
    const next = !cameraMutedRef.current;
    try {
      const applied = engine.mutePublishStreamVideo(local, next, false);
      if (!applied) {
        setError('Unable to toggle your camera. Please try again.');
        return;
      }
      cameraMutedRef.current = next;
      setCameraOn(!next);
    } catch {
      setError('Unable to toggle your camera. Please try again.');
    }
  }, []);

  const leave = useCallback(() => {
    teardown();
  }, [teardown]);

  return {
    localStream,
    remoteStreams,
    joined,
    error,
    cameraOn,
    micOn,
    mute,
    toggleCamera,
    leave,
  };
}