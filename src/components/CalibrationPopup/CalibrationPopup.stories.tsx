import { useState } from "react";
import { CalibrationPopup } from "./CalibrationPopup";

function useStoryProps(role: "host" | "player") {
  const [open, setOpen] = useState(true);
  const [musicVol, setMusicVol] = useState(0.7);
  const [signalVol, setSignalVol] = useState(0.8);
  const [haptic, setHaptic] = useState(true);
  const [shared, setShared] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tempOffset, setTempOffset] = useState(0);

  return {
    open,
    onClose: () => setOpen(false),
    role,
    music: {
      volume: musicVol,
      isPlaying: playing,
      onVolumeChange: setMusicVol,
      onTogglePlay: () => setPlaying((p) => !p),
    },
    signal: {
      volume: signalVol,
      onVolumeChange: setSignalVol,
      onTest: () => console.log("ring"),
    },
    vibration: {
      enabled: haptic,
      supported: true,
      onEnabledChange: setHaptic,
      onTest: () => console.log("vibrate"),
    },
    sharedHeadphones: {
      enabled: shared,
      onEnabledChange: setShared,
    },
    clock: {
      expanded,
      onToggleExpanded: () => setExpanded((e) => !e),
      offset: -187,
      tempOffset,
      onTempOffsetChange: setTempOffset,
      onApply: () => {
        console.log("apply", tempOffset);
        setTempOffset(0);
      },
      onResync: () => console.log("resync"),
      syncing: false,
      syncFailed: false,
      displayTimeMs: performance.now(),
      pulsing: false,
    },
  };
}

export const PlayerClosedClock = () => <CalibrationPopup {...useStoryProps("player")} />;
export const Host = () => <CalibrationPopup {...useStoryProps("host")} />;
export const VibrationUnsupported = () => {
  const props = useStoryProps("player");
  return (
    <CalibrationPopup
      {...props}
      vibration={{ ...props.vibration, supported: false, enabled: false }}
    />
  );
};
