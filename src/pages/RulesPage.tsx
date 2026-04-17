import { useTranslation } from "react-i18next";
import { rulesSections } from "./rules/rulesContent";
import { RulesSectionBlock } from "./rules/RulesSection";
import { RulesSidebar } from "./rules/RulesSidebar";
import styles from "./RulesPage.module.css";

export function RulesPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <RulesSidebar />
      <main className={styles.content}>
        <h1 className={styles.pageTitle}>{t("rules.title")}</h1>
        {rulesSections.map((section) => (
          <RulesSectionBlock key={section.id} section={section} />
        ))}
      </main>
    </div>
  );
}
