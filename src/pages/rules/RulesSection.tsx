// src/pages/rules/RulesSection.tsx
import { useTranslation } from "react-i18next";
import type { RulesSection as RulesSectionData } from "./rulesContent";
import { AvatarsIllustration } from "./illustrations/AvatarsIllustration";
import { EnvelopesIllustration } from "./illustrations/EnvelopesIllustration";
import { ScoringIllustration } from "./illustrations/ScoringIllustration";
import { BlitzChainIllustration } from "./illustrations/BlitzChainIllustration";
import { ModesIllustration } from "./illustrations/ModesIllustration";
import { AiReviewIllustration } from "./illustrations/AiReviewIllustration";
import styles from "../RulesPage.module.css";

const illustrationMap: Record<string, React.FC> = {
  avatars: AvatarsIllustration,
  envelopes: EnvelopesIllustration,
  scoring: ScoringIllustration,
  "blitz-chain": BlitzChainIllustration,
  modes: ModesIllustration,
  "ai-review": AiReviewIllustration,
};

export function RulesSectionBlock({ section }: { section: RulesSectionData }) {
  const { t } = useTranslation();
  const IllustrationComponent = section.illustration
    ? illustrationMap[section.illustration]
    : null;

  const textBlock = (
    <div className={styles.sectionText}>
      <h2 className={styles.sectionTitle}>{t(section.titleKey)}</h2>
      <div className={styles.sectionBody}>
        {t(section.textKey).split("\n").map((line, i) => (
          <p key={i}>{renderBold(line)}</p>
        ))}
      </div>
      {section.linkTo && section.linkKey && (
        <a
          href={section.linkTo}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sectionLink}
        >
          {t(section.linkKey)} ↗
        </a>
      )}
    </div>
  );

  if (section.direction === "text-only" || !IllustrationComponent) {
    return (
      <section id={section.id} className={styles.section}>
        {textBlock}
      </section>
    );
  }

  const imageBlock = (
    <div className={styles.sectionImage}>
      <IllustrationComponent />
    </div>
  );

  const directionClass = section.direction === "text-left" ? styles.textLeft : styles.textRight;

  return (
    <section
      id={section.id}
      className={`${styles.section} ${directionClass}`}
    >
      {textBlock}
      {imageBlock}
    </section>
  );
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
