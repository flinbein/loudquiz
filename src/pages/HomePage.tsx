import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("app.title")}</h1>
      <nav>
        <Link to="/play">{t("home.newGame")}</Link>
        <Link to="/constructor">{t("home.constructor")}</Link>
        <Link to="/rules">{t("home.rules")}</Link>
      </nav>
    </div>
  );
}
