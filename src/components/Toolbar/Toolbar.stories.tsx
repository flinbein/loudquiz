import { ActionType, ModeState, ThemeState, useLadleContext } from "@ladle/react";
import { Toolbar } from "./Toolbar";

export const Default = () => {
  const { globalState, dispatch } = useLadleContext();
  
  function toggleFullScreen() {
    if ( globalState.mode === ModeState.Full) {
      dispatch({
        type: ActionType.UpdateMode,
        value: ModeState.Preview,
      });
      void window.document.documentElement.requestFullscreen({navigationUI: "show"})
    } else {
      dispatch({
        type: ActionType.UpdateMode,
        value: ModeState.Full,
      })
      void window.document.exitFullscreen();
    }
  }
  
  return <div style={{ position: "relative", height: 200, background: "var(--color-bg)" }}>
    <Toolbar
      onOpenCalibration={() => console.log("cal")}
      onToggleFullscreen={toggleFullScreen}
      onToggleTheme={() => {
        dispatch({
          type: ActionType.UpdateTheme,
          value: globalState.theme === ThemeState.Dark ? ThemeState.Light : ThemeState.Dark,
        })
      }}
    />
  </div>
};
