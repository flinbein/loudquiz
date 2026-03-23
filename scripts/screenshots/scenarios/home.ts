/**
 * Скриншоты главного экрана:
 * - Главная страница (для ведущего — большой экран)
 * - Главная страница (для игрока — мобильный)
 * - Форма подключения к комнате (для игрока)
 */
import type { ScreenshotScenario } from "../types";

export const homeScenarios: ScreenshotScenario[] = [
  {
    name: "home_main_host",
    view: "home",
  },
  {
    name: "home_main_player",
    view: "player",
    // Без мока — PlayerPage покажет форму ввода кода/имени
  },
  {
    name: "home_join_player",
    view: "player",
    // Без мока — форма входа в комнату
    beforeScreenshot: async (page) => {
      // Вводим имя в поле, чтобы форма выглядела заполненной
      const nameInput = await page.$('input[placeholder*="мя"]');
      if (nameInput) {
        await nameInput.type("Алексей");
      }
    },
  },
];
