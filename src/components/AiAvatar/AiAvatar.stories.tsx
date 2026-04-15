import type { Story } from "@ladle/react";
import { AiAvatar } from "./AiAvatar";

export const Default: Story = () => (
  <div style={{ fontSize: 24 }}>
    <AiAvatar />
  </div>
);

export const SizesViaParentFontSize: Story = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    {[14, 20, 32, 48, 72].map((size) => (
      <div key={size} style={{ fontSize: size }}>
        <AiAvatar />
      </div>
    ))}
  </div>
);
