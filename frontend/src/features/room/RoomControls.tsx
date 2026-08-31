interface RoomControlsProps {
  /**
   * Whether this participant's microphone is publishing audio. Consumed
   * directly from `useZegoRoom.micOn` — the hook flips it only when the ZEGO SDK
   * confirms the `mutePublishStreamAudio` operation succeeded, so this is the
   * single source of truth for the mic button. Drives both the SDK mute/unmute
   * call and this button's "Mute"/"Unmute" label.
   */
  micOn: boolean;
  /**
   * Whether the local camera is publishing. Consumed directly from
   * `useZegoRoom.cameraOn` — the hook flips it only when the ZEGO SDK confirms
   * the `mutePublishStreamVideo` operation succeeded, so this is the single
   * source of truth for the camera button.
   */
  cameraOn: boolean;
  /** True once the hook has successfully joined the ZEGO room. The controls
   * stay disabled until then, and are disabled again after hang-up. */
  joined: boolean;
  /** True while leave/navigation is in progress; keeps Hang Up disabled so a
   * repeat click cannot double-leave or double-navigate. */
  leaving?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
}

/**
 * Interview-room call controls: microphone mute/unmute, camera on/off, and hang
 * up. Presentational only — mic/camera toggling and leave cleanup are owned by
 * `useZegoRoom` and invoked through the supplied callbacks. No engine or track
 * destruction happens here. Mic and camera state both arrive from the hook
 * (`micOn`/`cameraOn`), so toggling one can never disturb the other, and the
 * two buttons toggle independently.
 */
export default function RoomControls({
  micOn,
  cameraOn,
  joined,
  leaving = false,
  onToggleMic,
  onToggleCamera,
  onHangUp,
}: RoomControlsProps) {
  const disabled = !joined || leaving;

  function toggle(labelOn: string, active: boolean, labelOff: string, onClick: () => void) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        aria-label={active ? labelOn : labelOff}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={active ? '' : 'text-red-600'}>{active ? labelOn : labelOff}</span>
      </button>
    );
  }

  return (
    <div className="shrink-0 border-t border-gray-800 bg-gray-900 px-6 py-3">
      <div className="flex items-center justify-center gap-3">
        {toggle('Mute mic', micOn, 'Unmute mic', onToggleMic)}
        {toggle('Camera on', cameraOn, 'Camera off', onToggleCamera)}

        <button
          type="button"
          onClick={onHangUp}
          disabled={disabled}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Hang up
        </button>
      </div>
    </div>
  );
}