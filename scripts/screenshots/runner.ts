/**
 * Главный скрипт генерации скриншотов.
 * Запускает Vite dev server, открывает страницы через Puppeteer,
 * инжектит мок-состояние и делает скриншоты.
 *
 * Использование: npx tsx scripts/screenshots/runner.ts
 */
import { spawn, execSync, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import puppeteer, { type Browser, type Page } from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import type { ScreenshotScenario } from "./types";

const SCENARIOS_DIR = path.join(__dirname, "scenarios");

async function loadAllScenarios(): Promise<ScreenshotScenario[]> {
  const files = fs.readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".ts")).sort();
  const all: ScreenshotScenario[] = [];
  for (const file of files) {
    const filePath = path.join(SCENARIOS_DIR, file);
    const fileUrl = "file://" + filePath.replace(/\\/g, "/");
    const mod = await import(fileUrl);
    // Берём все экспортированные массивы сценариев
    for (const value of Object.values(mod)) {
      if (Array.isArray(value)) {
        all.push(...(value as ScreenshotScenario[]));
      }
    }
  }
  return all;
}

const VITE_PORT = 5199;
const BASE_URL = `http://localhost:${VITE_PORT}`;
const SCREENSHOTS_DIR = path.resolve(__dirname, "../../screenshots");
const THEMES = ["light", "dark"] as const;

const VIEWPORTS = {
  host: { width: 1920, height: 1080 },
  player: { width: 400, height: 700 },
  home: { width: 1920, height: 1080 },
} as const;

interface Result {
  name: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
}

// ── Vite dev server ───────────────────────────────────────────────────────────

function startVite(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const vite = spawn("npx", ["vite", "--port", String(VITE_PORT), "--strictPort"], {
      cwd: path.resolve(__dirname, "../.."),
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        vite.kill();
        reject(new Error("Vite не запустился за 30 секунд"));
      }
    }, 30000);

    vite.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (text.includes("Local:") || text.includes("localhost")) {
        if (!started) {
          started = true;
          clearTimeout(timeout);
          resolve(vite);
        }
      }
    });

    vite.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      // Vite иногда пишет в stderr
      if (text.includes("Local:") || text.includes("localhost")) {
        if (!started) {
          started = true;
          clearTimeout(timeout);
          resolve(vite);
        }
      }
    });

    vite.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    vite.on("exit", (code) => {
      if (!started) {
        clearTimeout(timeout);
        reject(new Error(`Vite завершился с кодом ${code}`));
      }
    });
  });
}

// ── CSS для отключения анимаций ───────────────────────────────────────────────

const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

// ── Скриншот одного сценария ──────────────────────────────────────────────────

async function takeScreenshot(
  browser: Browser,
  scenario: ScreenshotScenario,
  theme: "light" | "dark",
): Promise<Result> {
  const fileName = `${scenario.name}_${theme}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, fileName);

  // Пропускаем, если скриншот уже существует
  if (fs.existsSync(filePath)) {
    return { name: fileName, success: true, skipped: true };
  }

  const page = await browser.newPage();

  try {
    const viewport = VIEWPORTS[scenario.view];
    await page.setViewport(viewport);

    // Устанавливаем тему ДО загрузки страницы
    await page.evaluateOnNewDocument((th: string) => {
      localStorage.setItem("theme", th);
    }, theme);

    // Определяем URL
    let url: string;
    if (scenario.view === "home") {
      url = `${BASE_URL}/`;
    } else if (scenario.view === "host") {
      url = `${BASE_URL}/MOCK123/host`;
    } else {
      url = `${BASE_URL}/MOCK123`;
    }

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Отключаем анимации
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });

    // Применяем тему
    await page.evaluate((th: string) => {
      document.documentElement.classList.toggle("dark", th === "dark");
    }, theme);

    // Инжектим мок-состояние ПОСЛЕ загрузки страницы через page.evaluate + event
    if (scenario.mockHost || scenario.mockPlayer) {
      const mockPayload = JSON.stringify({
        mockHost: scenario.mockHost ?? null,
        mockPlayer: scenario.mockPlayer ?? null,
      });
      const escapedPayload = mockPayload.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      await page.evaluate(`
        (function() {
          var d = JSON.parse('${escapedPayload}');
          var now = Date.now();
          ['mockHost', 'mockPlayer'].forEach(function(key) {
            var m = d[key];
            if (!m) return;
            var gs = m.gameState;
            if (gs) {
              var drift = now - (gs.serverNow || now);
              gs.serverNow = now;
              if (gs.timer && gs.timer.endsAt) gs.timer.endsAt += drift;
              if (gs.topicSuggestEndsAt) gs.topicSuggestEndsAt += drift;
            }
            window['__MOCK_' + (key === 'mockHost' ? 'HOST' : 'PLAYER') + '_STATE__'] = m;
          });
          window.dispatchEvent(new Event('__applyMock'));
        })()
      `);

      await page.waitForFunction(() => (window as any).__MOCK_APPLIED__ === true, {
        timeout: 10000,
      });

      // Ждём ререндер после применения состояния
      await new Promise((r) => setTimeout(r, 300));
    }

    // Дополнительные действия перед скриншотом
    if (scenario.beforeScreenshot) {
      await scenario.beforeScreenshot(page);
    }

    await page.screenshot({ path: filePath, fullPage: false });
    return { name: fileName, success: true };
  } catch (err) {
    return {
      name: fileName,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await page.close();
  }
}

// ── Главный скрипт ────────────────────────────────────────────────────────────

async function main() {
  // Создать папку скриншотов, если не существует
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const ALL_SCENARIOS = await loadAllScenarios();
  const totalCount = ALL_SCENARIOS.length * THEMES.length;

  // Подсчитаем, сколько скриншотов уже существует
  let existingCount = 0;
  for (const scenario of ALL_SCENARIOS) {
    for (const theme of THEMES) {
      const filePath = path.join(SCREENSHOTS_DIR, `${scenario.name}_${theme}.png`);
      if (fs.existsSync(filePath)) existingCount++;
    }
  }

  console.log(`Сценариев: ${ALL_SCENARIOS.length}`);
  console.log(`Тем: ${THEMES.length}`);
  console.log(`Всего скриншотов: ${totalCount}`);
  if (existingCount > 0) {
    console.log(`Уже существует: ${existingCount}, нужно сделать: ${totalCount - existingCount}`);
  }

  if (existingCount === totalCount) {
    console.log("\nВсе скриншоты уже существуют. Ничего не делаем.");
    return;
  }

  console.log("");

  // Запускаем Vite
  console.log("Запуск Vite dev server...");
  const vite = await startVite();
  console.log(`Vite запущен на порту ${VITE_PORT}\n`);

  // Запускаем Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Прогреваем Vite: первый запрос компилирует все модули
  console.log("Прогрев Vite...");
  const warmupPage = await browser.newPage();
  await warmupPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle0", timeout: 30000 });
  await warmupPage.close();
  console.log("Готово\n");

  const results: Result[] = [];

  try {
    for (const scenario of ALL_SCENARIOS) {
      for (const theme of THEMES) {
        const result = await takeScreenshot(browser, scenario, theme);
        results.push(result);
        if (!result.skipped) {
          const icon = result.success ? "✅" : "❌";
          process.stdout.write(`${icon} ${result.name}\n`);
        }
      }
    }
  } finally {
    await browser.close();
    // На Windows vite.kill() не убивает дочерние процессы shell: true
    if (process.platform === "win32" && vite.pid) {
      try {
        execSync(`taskkill /pid ${vite.pid} /T /F`, { stdio: "ignore" });
      } catch { /* уже завершился */ }
    } else {
      vite.kill();
    }
  }

  // Отчёт
  console.log("\n" + "═".repeat(60));
  const skippedCount = results.filter((r) => r.skipped).length;
  const successCount = results.filter((r) => r.success && !r.skipped).length;
  const failCount = results.filter((r) => !r.success).length;
  console.log(`Готово: ${successCount} ✅  |  ${skippedCount} ⏭️  |  ${failCount} ❌`);

  const errors = results.filter((r) => !r.success);
  if (errors.length > 0) {
    console.log("\n--- Ошибки ---");
    for (const e of errors) {
      console.log(`  ${e.name}: ${e.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Критическая ошибка:", err);
  process.exit(1);
});
