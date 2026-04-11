import { useState } from "react";
import { ToggleSwitch } from "./ToggleSwitch";

export const Default = () => {
  const [on, setOn] = useState(false);
  return <ToggleSwitch checked={on} onChange={setOn} label="Vibration" />;
};

export const Checked = () => {
  const [on, setOn] = useState(true);
  return <ToggleSwitch checked={on} onChange={setOn} label="Vibration" />;
};

export const Disabled = () => (
  <ToggleSwitch checked={false} onChange={() => {}} disabled label="Disabled" />
);
