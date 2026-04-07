import type { Story } from "@ladle/react";
import { JokerState } from "./JokerState";

export const Enabled: Story = () => <JokerState state="enabled" onClick={() => console.log("joker!")} />;
export const Disabled: Story = () => <JokerState state="disabled" />;
export const Active: Story = () => <JokerState state="active" />;
