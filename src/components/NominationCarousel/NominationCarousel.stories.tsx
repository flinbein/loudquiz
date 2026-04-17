import type { Story } from "@ladle/react";
import { NominationCarousel } from "./NominationCarousel";
import type { Nomination } from "@/logic/nominations/types";

const nominations: Nomination[] = [
  {
    id: "sniper",
    emoji: "🎯",
    titleKey: "finale.nomination.sniper.title",
    descriptionKey: "finale.nomination.sniper.description",
    winners: [{ emoji: "😈", name: "Alice", team: "red" }],
    stat: "92%",
  },
  {
    id: "philosopher",
    emoji: "🤔",
    titleKey: "finale.nomination.philosopher.title",
    descriptionKey: "finale.nomination.philosopher.description",
    winners: [{ emoji: "👹", name: "Bob", team: "blue" }],
    stat: "12.5s",
  },
  {
    id: "flawless",
    emoji: "✨",
    titleKey: "finale.nomination.flawless.title",
    descriptionKey: "finale.nomination.flawless.description",
    winners: [
      { emoji: "😈", name: "Alice", team: "red" },
      { emoji: "👺", name: "Carol", team: "blue" },
    ],
  },
];

export const Default: Story = () => <NominationCarousel nominations={nominations} />;
export const SingleNomination: Story = () => <NominationCarousel nominations={[nominations[0]!]} />;
