import { useState } from "react";
import { MusicRow } from "./MusicRow";
import { SignalRow } from "./SignalRow";
import { VibrationRow } from "./VibrationRow";
import { SharedHeadphonesRow } from "./SharedHeadphonesRow";
import { InstructionsBlock } from "./InstructionsBlock";

export const Music = () => {
  const [v, setV] = useState(0.7);
  const [playing, setPlaying] = useState(false);
  return (
    <MusicRow
      volume={v}
      onVolumeChange={setV}
      isPlaying={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
    />
  );
};

export const Signal = () => {
  const [v, setV] = useState(0.8);
  return (
    <SignalRow volume={v} onVolumeChange={setV} onTest={() => {}} />
  );
};

export const VibrationSupported = () => {
  const [on, setOn] = useState(true);
  return (
    <VibrationRow
      enabled={on}
      onEnabledChange={setOn}
      onTest={() => {}}
      supported
    />
  );
};

export const VibrationUnsupported = () => (
  <VibrationRow
    enabled={false}
    onEnabledChange={() => {}}
    onTest={() => {}}
    supported={false}
  />
);

export const SharedHeadphones = () => {
  const [on, setOn] = useState(false);
  return <SharedHeadphonesRow enabled={on} onEnabledChange={setOn} />;
};

export const Instructions = () => <InstructionsBlock />;
