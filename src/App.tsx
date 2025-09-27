import { useEffect } from "react";
import { useTheme } from "./hooks/useTheme";
import { useLanguage } from "./hooks/useLanguage";
import { LanguageSelector } from "./components/LanguageSelector";
import { useAddonManager } from "./hooks/useAddonManager";
import { GameStatus } from "./components/GameStatus";
import { PathControls } from "./components/PathControls";
import { AddonsList } from "./components/AddonList";
import { ErrorMessage } from "./components/ErrorMessage";
import "./i18n";

export default function App() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const {
    gamePath,
    addonOrder,
    addonImages,
    loading,
    error,
    l4d2Running,
    selectedCount,
    loadAddons,
    restoreSelectedAddons,
    toggleAddon,
    moveAddon,
    recreateActiveAddons,
    chooseDir,
    clearPath,
    toggleGameRunning,
    updateGameInfo,
  } = useAddonManager();

  useEffect(() => {
    if (!gamePath) return;

    const init = async () => {
      try {
        await loadAddons(gamePath);
        restoreSelectedAddons();
      } catch (err) {
        console.error("Error on init:", err);
      }
    };

    init();
  }, [gamePath, loadAddons, restoreSelectedAddons]);

  useEffect(() => {
    if (!gamePath) return;
    if (addonOrder.length === 0) return;

    updateGameInfo(false, addonOrder);
  }, [addonOrder, gamePath, updateGameInfo]);

  return (
    <main className="p-6 mx-auto font-sans bg-gray-50 text-gray-900 min-h-screen transition-colors duration-300 dark:bg-gray-900 dark:text-gray-100">
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
            {theme === "dark"
              ? `🌞 ${t("lightTheme")}`
              : `🌙 ${t("darkTheme")}`}
          </button>
        </div>
      </div>

      <GameStatus
        l4d2Running={l4d2Running}
        selectedCount={selectedCount}
        toggleGameRunning={toggleGameRunning}
        t={t}
      />

      {error && <ErrorMessage error={error} />}

      <PathControls
        gamePath={gamePath}
        chooseDir={chooseDir}
        clearPath={clearPath}
        recreateActiveAddons={recreateActiveAddons}
        t={t}
      />

      {gamePath && (
        <>
          <h2 className="text-2xl font-semibold mb-4 text-indigo-600 dark:text-green-300">
            {t("detectedAddons")}:
          </h2>

          <AddonsList
            loading={loading}
            addonOrder={addonOrder}
            addonImages={addonImages}
            toggleAddon={toggleAddon}
            moveAddon={moveAddon}
            t={t}
          />
        </>
      )}
    </main>
  );
}
