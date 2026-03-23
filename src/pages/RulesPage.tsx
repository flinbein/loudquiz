import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/shared/ThemeToggle";

export default function RulesPage() {
  return (
    <div className="min-h-[100dvh] bg-game text-slate-900 dark:text-white">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-all"
          >
            &larr; Главная
          </Link>
          <h1 className="text-xl font-bold">Правила игры</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-3">LoudQuiz</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            LoudQuiz — командная викторина, в которой игроки надевают наушники с музыкой
            и не слышат друг друга. Капитан команды объясняет вопрос только жестами и мимикой,
            а остальные игроки пытаются угадать ответ.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Как играть</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300">
            <li>Ведущий создаёт комнату и показывает QR-код на большом экране.</li>
            <li>Игроки подключаются со своих телефонов, сканируя QR-код или вводя код комнаты.</li>
            <li>Игроки распределяются по командам (красные / синие).</li>
            <li>Все надевают наушники с музыкой и проходят калибровку громкости.</li>
            <li>Каждый раунд один из игроков становится капитаном.</li>
            <li>Капитан видит вопрос на своём телефоне и объясняет его жестами, мимикой — и даже словами! Игроки в наушниках всё равно не слышат, но могут пытаться читать по губам.</li>
            <li>Остальные игроки команды вводят ответы на своих телефонах.</li>
            <li>После окончания таймера ведущий (или ИИ) проверяет ответы.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Начисление баллов</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
            <li>
              <strong>Стандартный раунд:</strong> сложность вопроса &times; количество уникальных
              правильных ответов.
            </li>
            <li>
              <strong>Джокер:</strong> у каждой команды есть 1 джокер за игру. Активируйте его
              перед выбором вопроса — он удвоит набранные очки в этом раунде (если ответ правильный).
            </li>
            <li>
              <strong>Бонус за скорость:</strong> если все игроки ответили до окончания таймера,
              команда получает дополнительные баллы.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Блиц</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            В блиц-раунде капитан объясняет одно слово, а игроки отвечают по очереди.
            Каждый правильный ответ в цепочке приносит всё больше очков.
            Если кто-то ошибается — цепочка обрывается.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Роли</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold mb-1">Ведущий</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Управляет игрой на большом экране. Загружает вопросы, проверяет ответы.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold mb-1">Игрок</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Играет в команде. Надевает наушники, отвечает на вопросы или становится капитаном.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold mb-1">Зритель</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Наблюдает за игрой, не участвует в ответах.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Советы</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
            <li>Убедитесь, что музыка в наушниках достаточно громкая — игроки не должны слышать разговоры.</li>
            <li>Капитан может использовать жесты, мимику, движения и даже речь — игроки в наушниках не слышат, но могут читать по губам.</li>
            <li>Не забудьте про джокер — используйте его на сложном вопросе, когда уверены в команде.</li>
            <li>В блице договоритесь о порядке заранее — первые в цепочке берут на себя больше ответственности.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
