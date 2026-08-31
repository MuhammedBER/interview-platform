import { useEffect, useRef } from 'react';

interface VideoTileProps {
  label: string;
  stream: MediaStream | null;
  /**
   * Show the "waiting for the other person to join" placeholder when no
   * stream has arrived yet.
   */
  waiting?: boolean;
  /** Silences local playback (feedback echo) for the caller's own tile. */
  muted?: boolean;
  /**
   * Explicit camera-on state for the caller's own tile. Reading the real track
   * is authoritative; this prop just forces re-render when it is toggled.
   */
  cameraOn?: boolean;
}

/**
 * Video tile that binds a live MediaStream into a <video> via srcObject.
 * When a stream exists but its video track is disabled it renders a distinct
 * "camera off" state; with no stream at all it shows the given placeholder.
 */
export default function VideoTile({ label, stream, waiting = false, muted = false, cameraOn }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      void el.play().catch(() => {
        // autoplay may be blocked until the user interacts; tile still shows.
      });
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  const activeVideoTrack = stream?.getVideoTracks()[0];
  const cameraEnabled = cameraOn ?? (activeVideoTrack ? activeVideoTrack.enabled : null);
  const cameraOff = stream !== null && cameraEnabled === false;
  const notJoined = stream === null && waiting;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      </div>
      <div className="relative min-h-0 flex-1">
        {stream !== null ? (
          <video
            ref={videoRef}
            muted={muted}
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${cameraOff ? 'hidden' : ''}`}
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center">
          {cameraOff ? (
            <p className="text-sm text-gray-400">Camera off</p>
          ) : notJoined ? (
            <p className="text-sm text-gray-400">Waiting for {label.toLowerCase()} to join…</p>
          ) : stream === null ? (
            <p className="text-sm text-gray-400">Camera off / not connected</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
