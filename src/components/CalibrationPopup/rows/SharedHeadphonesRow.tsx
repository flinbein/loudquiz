import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "@/components/ToggleSwitch/ToggleSwitch";
import { CalibrationRow } from "./CalibrationRow";

export interface SharedHeadphonesRowProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function SharedHeadphonesRow({
  enabled,
  onEnabledChange,
}: SharedHeadphonesRowProps) {
  const { t } = useTranslation();
  return (
    <CalibrationRow
      icon={"\u{1F3A7}"}
      label={t("calibration.sharedHeadphones")}
    >
      <ToggleSwitch
        checked={enabled}
        onChange={onEnabledChange}
        label={t("calibration.sharedHeadphones")}
      />
    </CalibrationRow>
  );
}
