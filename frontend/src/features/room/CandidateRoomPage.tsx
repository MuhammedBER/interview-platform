import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCandidateVideoToken } from './api';
import { useZegoRoom } from './useZegoRoom';
import VideoTiles from './VideoTiles';
import RoomControls from './RoomControls';

/**
 * Candidate live video-call screen at /join/:token/room.
 *
 * The candidate reaches this page automatically from the waiting room once it
 * reports `admitted === true`, so there is no manual "Join" button. The raw
 * join token (from the URL) is only ever handed to the candidate video-token
 * flow — it is never rendered or logged.
 *
 * This page is intentionally minimal and structurally independent from the
 * recruiter room: only the video call and the three essential call controls.
 * No cockpit, notes, segments, questions, timer, waiting banner, admit button,
 * sidebar or top bar are rendered or mounted.
 *
 * ZEGO ownership lives entirely in `useZegoRoom`: candidate token fetching,
 * engine creation, joining, local stream, publishing, remote streams, mute/
 * camera state, leaving and SDK cleanup are all handled there. This page only
 * consumes the hook's resulting streams/callbacks.
 */
export default function CandidateRoomPage() {
  const { token } = useParams<{ token: string }>();

  const [left, setLeft] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const video = useZegoRoom({
    fetchToken: useCallback(() => getCandidateVideoToken(token ?? ''), [token]),
    role: 'candidate',
  });

  // Mic/camera on/off is state owned by `useZegoRoom` (`micOn`/`cameraOn`),
  // flipped only when the ZEGO SDK confirms the toggle, so the tiles and
  // controls re-render from that state directly. No local mirror is needed.
  function handleToggleMic() {
    video.mute();
  }

  function handleToggleCamera() {
    video.toggleCamera();
  }

  function handleHangUp() {
    setLeaving(true);
    video.leave();
    setLeft(true);
  }

  function renderBody() {
    if (video.error !== null) {
      // The hook surfaces a sanitised, non-credential message already.
      return (
        <div className="max-w-md text-center">
          <p role="alert" className="text-sm text-white">
            {video.error}
          </p>
          <p className="mt-3 text-xs text-gray-400">
            If this keeps happening, please contact the recruiter. You can safely close this
            window.
          </p>
        </div>
      );
    }

    if (left) {
      return (
        <div className="text-center">
          <p className="text-base text-white">The call has ended.</p>
          <p className="mt-3 text-sm text-gray-400">
            Thank you for attending. You may close this window.
          </p>
        </div>
      );
    }

    if (!video.joined) {
      return (
        <div className="text-center" aria-live="polite">
          <p className="text-base text-white">Connecting to the call…</p>
          <p className="mt-3 text-sm text-gray-400">
            Please allow your camera and microphone access when prompted.
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <VideoTiles
          localLabel="You"
          localStream={video.localStream}
          remoteStreams={video.remoteStreams}
          remoteLabel="Recruiter"
          localCameraOn={video.cameraOn}
        />
        <RoomControls
          micOn={video.micOn}
          cameraOn={video.cameraOn}
          joined={video.joined}
          leaving={leaving}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onHangUp={handleHangUp}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900 px-6">
      <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center">
        {renderBody()}
      </div>
    </div>
  );
}
