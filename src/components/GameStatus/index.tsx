import React from "react";

interface GameStatusProps {
  l4d2Running: boolean;
  selectedCount: number;
  toggleGameRunning: () => void;
  t: (key: string) => string;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  l4d2Running,
  selectedCount,
  toggleGameRunning,
  t,
}) => {
  return (
    <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-2xl p-4 transition">
      <p className="mb-1">
        <strong>{t("gameStatus")}:</strong>{" "}
        <span
          className={
            l4d2Running
              ? "text-green-600 dark:text-green-400 font-bold"
              : "text-red-600 dark:text-red-500 font-bold"
          }
        >
          {l4d2Running ? t("running") : t("notRunning")}
        </span>
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <strong>{t("selectedAddons")}:</strong> {selectedCount}
      </p>
      <button
        onClick={toggleGameRunning}
        className="mt-3 px-5 py-2 rounded-xl shadow bg-indigo-600 text-white font-medium hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition"
      >
        {l4d2Running ? t("setNotRunning") : t("setRunning")}
      </button>
    </div>
  );
};
