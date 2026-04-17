// src/pages/rules/rulesContent.ts

export interface RulesSection {
  id: string;
  titleKey: string;
  textKey: string;
  direction: "text-left" | "text-right" | "text-only";
  illustration: "avatars" | "envelopes" | "scoring" | "blitz-chain" | "modes" | "ai-review" | null;
  linkKey?: string;
  linkTo?: string;
}

export const rulesSections: RulesSection[] = [
  {
    id: "what-is",
    titleKey: "rules.whatIs.title",
    textKey: "rules.whatIs.text",
    direction: "text-left",
    illustration: "avatars",
  },
  {
    id: "round",
    titleKey: "rules.round.title",
    textKey: "rules.round.text",
    direction: "text-right",
    illustration: "envelopes",
  },
  {
    id: "scoring",
    titleKey: "rules.scoring.title",
    textKey: "rules.scoring.text",
    direction: "text-left",
    illustration: "scoring",
  },
  {
    id: "blitz",
    titleKey: "rules.blitz.title",
    textKey: "rules.blitz.text",
    direction: "text-right",
    illustration: "blitz-chain",
  },
  {
    id: "modes",
    titleKey: "rules.modes.title",
    textKey: "rules.modes.text",
    direction: "text-left",
    illustration: "modes",
  },
  {
    id: "ai",
    titleKey: "rules.ai.title",
    textKey: "rules.ai.text",
    direction: "text-right",
    illustration: "ai-review",
  },
  {
    id: "constructor",
    titleKey: "rules.constructor.title",
    textKey: "rules.constructor.text",
    direction: "text-only",
    illustration: null,
    linkKey: "rules.constructor.link",
    linkTo: "/constructor",
  },
];
