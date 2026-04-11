import { Toolbar } from "./Toolbar";

export const Default = () => (
  <div style={{ position: "relative", height: 200, background: "#222" }}>
    <Toolbar
      onOpenCalibration={() => console.log("cal")}
      onToggleFullscreen={() => console.log("fs")}
      onToggleTheme={() => console.log("theme")}
    />
  </div>
);
