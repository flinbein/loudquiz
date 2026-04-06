import { useTranslation } from "react-i18next";

export function ConstructorPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("constructor.title")}</h1>
    </div>
  );
}
