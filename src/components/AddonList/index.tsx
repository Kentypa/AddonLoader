import { AddonCard } from "../AddonCard";
import type { AddonOrder } from "../../types/addonOrder";
import type { FC } from "react";

interface AddonsListProps {
  loading: boolean;
  addonOrder: AddonOrder[];
  addonImages: Record<string, string>;
  toggleAddon: (vpkName: string) => void;
  moveAddon: (vpkName: string, direction: "up" | "down") => void;
  t: (key: string) => string;
}

export const AddonsList: FC<AddonsListProps> = ({
  loading,
  addonOrder,
  addonImages,
  toggleAddon,
  moveAddon,
  t,
}) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>{t("loadingAddons")}</span>
      </div>
    );
  }

  if (addonOrder.length === 0) {
    return (
      <p className="text-gray-600 dark:text-gray-400">{t("noAddonsFound")}</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {addonOrder.map((addonItem, index) => (
        <AddonCard
          key={addonItem.name}
          addonItem={addonItem}
          index={index}
          totalCount={addonOrder.length}
          imageUrl={addonImages[addonItem.name]}
          toggleAddon={toggleAddon}
          moveAddon={moveAddon}
          t={t}
        />
      ))}
    </div>
  );
};
