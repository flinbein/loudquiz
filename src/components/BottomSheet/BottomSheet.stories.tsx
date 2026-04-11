import { useState } from "react";
import { BottomSheet } from "./BottomSheet";

export const Default = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabel="demo">
        <div style={{ padding: 16 }}>
          <h3>Hello sheet</h3>
          <p>Click backdrop, hit Escape, or drag the handle down to close.</p>
        </div>
      </BottomSheet>
    </>
  );
};
