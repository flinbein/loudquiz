import { useState } from "react";
import { VolumeSlider } from "./VolumeSlider";

export const Default = () => {
  const [v, setV] = useState(0.7);
  return <VolumeSlider value={v} onChange={setV} label="Music" />;
};

export const Zero = () => {
  const [v, setV] = useState(0);
  return <VolumeSlider value={v} onChange={setV} label="Music" />;
};

export const Disabled = () => (
  <VolumeSlider value={0.3} onChange={() => {}} disabled label="Music" />
);
