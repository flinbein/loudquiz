import type { Story } from "@ladle/react";
import { Timer } from "./Timer";

export const Default: Story = () => <Timer time={60}>Выбор капитана</Timer>;
export const Short: Story = () => <Timer time={20}>Ответы</Timer>;
export const Warning: Story = () => <Timer time={8} warningTime={10}>Осталось мало!</Timer>;
export const Expired: Story = () => <Timer time={0}>Время вышло</Timer>;
