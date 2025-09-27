import React from "react";

interface PathControlsProps {
  gamePath: string;
  chooseDir: () => void;
  clearPath: () => void;
  recreateActiveAddons: () => void;
  t: (key: string) => string;
}

export const PathControls: React.FC<PathControlsProps> = ({
  gamePath,
  chooseDir,
  clearPath,
  recreateActiveAddons,
  t,
}) => {
  if (!gamePath) {
    return (
      <button
        onClick={chooseDir}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl shadow hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 transition"
      >
        {t("selectGameFolder")}
      </button>
    );
  }

  return (
    <>
      <p className="mb-3 text-gray-700 dark:text-gray-300">
        <strong>{t("currentPath")}:</strong> {gamePath}
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={chooseDir}
          className="px-4 py-2 rounded-xl shadow bg-green-600 text-white hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 transition"
        >
          {t("changeFolder")}
        </button>
        <button
          onClick={clearPath}
          className="px-4 py-2 rounded-xl shadow bg-red-600 text-white hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 transition"
        >
          {t("clear")}
        </button>
        <button
          onClick={recreateActiveAddons}
          className="px-4 py-2 rounded-xl shadow bg-purple-600 text-white hover:bg-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600 transition"
        >
          {t("refreshAddons")}
        </button>
      </div>
    </>
  );
};
