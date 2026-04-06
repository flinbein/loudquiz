import { useTranslation } from "react-i18next";

export function RulesPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("rules.title")}</h1>
    </div>
  );
}
