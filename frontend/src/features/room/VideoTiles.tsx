import { useEffect, useRef } from 'react';
import type { ActiveRemoteStream } from './useZegoRoom';

interface VideoTilesProps {
  /** Label for the local tile, e.g. "You" / the participant's name. */
  localLabel: string;
  /** The actively published local stream from `useZegoRoom`. */
  localStream: MediaStream | null;
  /**
   * Remote streams currently being played from `useZegoRoom`, keyed by stream ID.
   * FE4-01 has exactly two tiles, so only the first remote stream is rendered.
   */
  remoteStreams: ActiveRemoteStream[];
  /** Label for the remote tile, e.g. "Recruiter" / "Candidate". */
  remoteLabel: string;
  /**
   * Whether the local camera is enabled. Because `useZegoRoom` does not expose
   * camera state, the room page passes the current value (its own mirror of the
   * toggle) so this component re-renders when it changes; the authoritative
   * value is also read from the live video track below.
   */
  localCameraOn?: boolean;
}

interface TileState {
  stream: MediaStream | null;
  cameraOff: boolean;
  noStream: boolean;
}

function describeTile(
  stream: MediaStream | null,
  explicitCameraOn: boolean | undefined,
  local: boolean
): TileState {
  if (stream === null) {
    return { stream: null, cameraOff: false, noStream: true };
  }
  const videoTrackEnabled = stream.getVideoTracks()[0]?.enabled;
  const cameraEnabled = local
    ? explicitCameraOn ?? videoTrackEnabled ?? true
    : videoTrackEnabled ?? true;
  return {
    stream,
    cameraOff: cameraEnabled === false,
    noStream: false,
  };
}

function TileVideo({ stream, muted }: { stream: MediaStream; muted: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Rebind whenever the hook replaces the stream object; clearing to null
    // drops the srcObject so a stale/removed stream no longer shows.
    el.srcObject = stream;
    void el.play().catch(() => {
      // Autoplay may be blocked until the user interacts; the tile still shows.
    });
  }, [stream]);

  return (
    <video
      ref={videoRef}
      muted={muted}
      autoPlay
      playsInline
      className="h-full w-full object-cover"
    />
  );
}

/**
 * Centered "camera off" placeholder for either tile: a muted-camera glyph with
 * the participant's name beneath, matching the room's dark-tile convention.
 */
function CameraOffPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-10 w-10 text-gray-600"
      >
        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-0.5 text-sm text-gray-500">Camera off</p>
      </div>
    </div>
  );
}

/**
 * Renders the two interview-room video tiles (local + remote) from the streams
 * owned by `useZegoRoom`. Renders exactly two tiles and nothing else — no
 * cockpit, no controls, no lifecycle management. Camera state is read from the
 * live video track (the repo convention); the local tile is additionally muted
 * so the caller's microphone does not echo back into their own playback.
 */
export default function VideoTiles({
  localLabel,
  localStream,
  remoteStreams,
  remoteLabel,
  localCameraOn,
}: VideoTilesProps) {
  const local = describeTile(localStream, localCameraOn, true);
  const remote = describeTile(remoteStreams[0]?.stream ?? null, undefined, false);

  return (
    <main className="flex min-h-0 flex-1 gap-4 p-6">
      <section
        aria-label={`${localLabel} camera feed`}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800"
      >
        <header className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {localLabel}
          </span>
        </header>
        <div className="relative min-h-0 flex-1">
          {local.stream !== null && !local.cameraOff ? (
            <TileVideo stream={local.stream} muted />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            {local.cameraOff ? (
              <CameraOffPlaceholder label={localLabel} />
            ) : local.noStream ? (
              <p className="px-4 text-sm text-gray-400">Camera off / not connected</p>
            ) : null}
          </div>
        </div>
      </section>

      <section
        aria-label={`${remoteLabel} camera feed`}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800"
      >
        <header className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {remoteLabel}
          </span>
        </header>
        <div className="relative min-h-0 flex-1">
          {remote.stream !== null && !remote.cameraOff ? (
            <TileVideo stream={remote.stream} muted={false} />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            {remote.cameraOff ? (
              <CameraOffPlaceholder label={remoteLabel} />
            ) : remote.noStream ? (
              <p className="px-4 text-sm text-gray-400">
                Waiting for {remoteLabel.toLowerCase()} to join…
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
