import type { Story } from "@ladle/react";
import { Toolbar } from "./Toolbar";

const noop = () => {};
const defaultActions = {
  onOpenCalibration: noop,
  onToggleFullscreen: noop,
  onToggleTheme: noop,
};

const demoPlayers = [
  { emoji: "🐰", name: "Alice", team: "red" as const, online: true, ready: true },
  { emoji: "🐶", name: "Bob", team: "red" as const, online: true, ready: true },
  { emoji: "🦊", name: "Carol", team: "blue" as const, online: true, ready: true },
  { emoji: "🐸", name: "Dave", team: "blue" as const, online: false, ready: true },
];

export const GameToolbarOverlay: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar {...defaultActions} variant="overlay" />
    <p style={{ padding: 60 }}>Host screen content</p>
  </div>
);

export const GameToolbarInline: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar {...defaultActions} variant="inline" />
    <p style={{ padding: 16 }}>Content below toolbar</p>
  </div>
);

export const PlayerToolbarOverlay: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar
      {...defaultActions}
      variant="overlay"
      player={{ emoji: "🐰", name: "Alice", team: "red" }}
      phaseName="Идут ответы"
      phaseTeam="red"
      players={demoPlayers}
      teamLabels={{ red: "Красные", blue: "Синие" }}
    />
    <p style={{ padding: 60 }}>Player screen content</p>
  </div>
);

export const PlayerToolbarInline: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar
      {...defaultActions}
      variant="inline"
      player={{ emoji: "🐶", name: "Bob", team: "blue" }}
      phaseName="Капитан выбирает задание"
      phaseTeam="red"
      players={demoPlayers}
      teamLabels={{ red: "Красные", blue: "Синие" }}
    />
    <p style={{ padding: 16 }}>Player content below</p>
  </div>
);

export const PlayerToolbarMenuOpen: Story = () => (
  <div style={{ height: 300, background: "var(--color-bg)" }}>
    <Toolbar
      {...defaultActions}
      variant="inline"
      player={{ emoji: "🐰", name: "Alice", team: "red" }}
      phaseName="Проверка"
      phaseTeam="blue"
    />
    <p style={{ padding: 16, fontSize: 12, color: "gray" }}>Click the hamburger button to open menu</p>
  </div>
);

export const PlayerToolbarPlayersListOpen: Story = () => (
  <div style={{ height: 400, background: "var(--color-bg)" }}>
    <Toolbar
      {...defaultActions}
      variant="inline"
      player={{ emoji: "🐰", name: "Alice", team: "red" }}
      phaseName="Лобби"
      phaseTeam="none"
      players={demoPlayers}
      teamLabels={{ red: "Красные", blue: "Синие" }}
    />
    <p style={{ padding: 16, fontSize: 12, color: "gray" }}>Click avatar to open players list</p>
  </div>
);
