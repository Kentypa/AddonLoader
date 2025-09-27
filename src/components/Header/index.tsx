import { useLanguage } from "../../hooks/useLanguage";
import { useTheme } from "../../hooks/useTheme";
import { LanguageSelector } from "../LanguageSelector";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-indigo-600 dark:text-green-400">
        {t("title")}
      </h1>

      <div className="flex items-center gap-3">
        <LanguageSelector />

        <button
          onClick={toggleTheme}
          className="px-3 py-1 rounded-xl shadow bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          {theme === "dark" ? `🌞 ${t("lightTheme")}` : `🌙 ${t("darkTheme")}`}
        </button>
      </div>
    </div>
  );
}
