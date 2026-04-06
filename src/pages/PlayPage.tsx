import { useTranslation } from "react-i18next";

export function PlayPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("play.title")}</h1>
    </div>
  );
}
