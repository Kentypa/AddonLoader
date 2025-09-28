import { useState, useEffect, type FC } from "react";
import { useSteamWorkshop } from "../../hooks/useSteamWorkshop";
import type { AddonOrder } from "../../types/addonOrder";

interface AddonCardProps {
  addonItem: AddonOrder;
  index: number;
  totalCount: number;
  imageUrl?: string;
  toggleAddon: (vpkName: string) => void;
  moveAddon: (vpkName: string, direction: "up" | "down") => void;
  t: (key: string) => string;
}

export const AddonCard: FC<AddonCardProps> = ({
  addonItem,
  index,
  totalCount,
  imageUrl,
  toggleAddon,
  moveAddon,
  t,
}) => {
  const { name: vpkName, enabled: isSelected } = addonItem;
  const {
    extractWorkshopId,
    loadModInfo,
    getModTitle,
    getModDescription,
    getModInfo,
    isModLoading,
  } = useSteamWorkshop();

  const workshopId = extractWorkshopId(vpkName);
  const [showDescription, setShowDescription] = useState(false);

  const modTitle = getModTitle(vpkName);
  const modDescription = getModDescription(vpkName);
  const modInfo = getModInfo(vpkName);
  const loadingDescription = isModLoading(vpkName);

  useEffect(() => {
    if (workshopId && !modInfo && !loadingDescription) {
      loadModInfo(vpkName);
    }
  }, [workshopId, modInfo, loadingDescription, loadModInfo, vpkName]);

  const handleShowDescription = async () => {
    if (
      !showDescription &&
      workshopId &&
      !modDescription &&
      !loadingDescription
    ) {
      await loadModInfo(vpkName);
    }
    setShowDescription(!showDescription);
  };

  return (
    <div
      className={`flex flex-col gap-3 p-4 rounded-2xl shadow transition border ${
        isSelected
          ? "border-green-500 bg-green-50 dark:bg-gray-800"
          : "border-gray-300 dark:border-gray-700 hover:border-indigo-400"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => moveAddon(vpkName, "up")}
            disabled={index === 0}
            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title={t("moveUp")}
          >
            ↑
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {index + 1}
          </span>
          <button
            onClick={() => moveAddon(vpkName, "down")}
            disabled={index === totalCount - 1}
            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title={t("moveDown")}
          >
            ↓
          </button>
        </div>

        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleAddon(vpkName)}
          className="w-5 h-5 accent-indigo-600 dark:accent-green-500"
        />

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={modTitle}
            className="w-16 h-16 object-cover rounded-xl flex-shrink-0 shadow"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate">
              {modTitle}
            </h3>
            {loadingDescription && (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
          </div>
          {workshopId && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Workshop ID: {workshopId}
            </p>
          )}
          {isSelected && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              ✓ {t("activeAs")}{" "}
              <span className="font-mono">{addonItem.addonId}</span> (
              {t("priority")}: {index + 1})
            </div>
          )}
        </div>

        {workshopId && (
          <button
            onClick={handleShowDescription}
            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white transition-colors"
            title={showDescription ? "Hide description" : "Show description"}
            disabled={loadingDescription}
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                showDescription ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {showDescription && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {modDescription ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    modDescription.replace(/\n/g, "<br>").slice(0, 500) +
                    (modDescription.length > 500 ? "..." : ""),
                }}
              />
            </div>
          ) : loadingDescription ? (
            <p className="text-sm text-gray-500 dark:text-gray-500 italic">
              Loading description...
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-500 italic">
              Description not available
            </p>
          )}
        </div>
      )}
    </div>
  );
};
