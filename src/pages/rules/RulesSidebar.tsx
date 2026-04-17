// src/pages/rules/RulesSidebar.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { rulesSections } from "./rulesContent";
import styles from "../RulesPage.module.css";

export function RulesSidebar() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(rulesSections[0]!.id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    for (const section of rulesSections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className={styles.sidebar} aria-label="Rules sections">
      <ul className={styles.sidebarList}>
        {rulesSections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`${styles.sidebarLink} ${activeId === section.id ? styles.sidebarLinkActive : ""}`}
              aria-current={activeId === section.id ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(section.id);
                if (!el) return;
                setActiveId(section.id);
                const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
                window.history.replaceState(null, "", `#${section.id}`);
              }}
            >
              {t(section.titleKey)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
