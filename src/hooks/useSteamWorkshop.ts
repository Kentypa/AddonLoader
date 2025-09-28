import { useState, useCallback } from "react";
import { steamWorkshopService } from "../services/steamService";
import type { CachedModInfo } from "../types/steam/cachedModInfo";

interface ModCache {
  [workshopId: string]: CachedModInfo;
}

export const useSteamWorkshop = () => {
  const [modCache, setModCache] = useState<ModCache>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const extractWorkshopId = useCallback((filename: string): string | null => {
    return steamWorkshopService.extractWorkshopId(filename);
  }, []);

  const loadModTitles = useCallback(
    async (filenames: string[]): Promise<void> => {
      const workshopIds = filenames
        .map((filename) => extractWorkshopId(filename))
        .filter((id): id is string => id !== null);

      if (workshopIds.length === 0) return;

      setLoading((prev) => {
        const newLoading = new Set(prev);
        workshopIds.forEach((id) => newLoading.add(id));
        return newLoading;
      });

      try {
        const modInfos = await steamWorkshopService.getModTitlesBatch(
          filenames
        );

        setModCache((prevCache) => ({
          ...prevCache,
          ...modInfos,
        }));
      } catch (error) {
        console.error("Failed to load mod titles:", error);
      } finally {
        setLoading((prev) => {
          const newLoading = new Set(prev);
          workshopIds.forEach((id) => newLoading.delete(id));
          return newLoading;
        });
      }
    },
    [extractWorkshopId]
  );

  const loadModInfo = useCallback(
    async (filename: string): Promise<CachedModInfo | null> => {
      const workshopId = extractWorkshopId(filename);
      if (!workshopId) return null;

      if (modCache[workshopId]) {
        return modCache[workshopId];
      }

      if (loading.has(workshopId)) {
        return null;
      }

      setLoading((prev) => new Set(prev).add(workshopId));

      try {
        const modInfo = await steamWorkshopService.getModInfo(filename);
        if (modInfo) {
          setModCache((prevCache) => ({
            ...prevCache,
            [workshopId]: modInfo,
          }));
          return modInfo;
        }
      } catch (error) {
        console.error("Failed to load mod info:", error);
      } finally {
        setLoading((prev) => {
          const newLoading = new Set(prev);
          newLoading.delete(workshopId);
          return newLoading;
        });
      }

      return null;
    },
    [extractWorkshopId, modCache, loading]
  );

  const getModTitle = useCallback(
    (filename: string): string => {
      const workshopId = extractWorkshopId(filename);
      if (!workshopId) return filename;

      return modCache[workshopId]?.title || workshopId;
    },
    [extractWorkshopId, modCache]
  );

  const getModDescription = useCallback(
    (filename: string): string => {
      const workshopId = extractWorkshopId(filename);
      if (!workshopId) return "";

      return modCache[workshopId]?.description || "";
    },
    [extractWorkshopId, modCache]
  );

  const getModInfo = useCallback(
    (filename: string): CachedModInfo | null => {
      const workshopId = extractWorkshopId(filename);
      if (!workshopId) return null;

      return modCache[workshopId] || null;
    },
    [extractWorkshopId, modCache]
  );

  const isModLoading = useCallback(
    (filename: string): boolean => {
      const workshopId = extractWorkshopId(filename);
      if (!workshopId) return false;

      return loading.has(workshopId);
    },
    [extractWorkshopId, loading]
  );

  const refreshModTitles = useCallback(
    async (filenames: string[]): Promise<void> => {
      const workshopIds = filenames
        .map((filename) => extractWorkshopId(filename))
        .filter((id): id is string => id !== null);

      // Очищаем кэш для этих модов
      setModCache((prevCache) => {
        const newCache = { ...prevCache };
        workshopIds.forEach((id) => delete newCache[id]);
        return newCache;
      });

      await loadModTitles(filenames);
    },
    [extractWorkshopId, loadModTitles]
  );

  const clearCache = useCallback(() => {
    setModCache({});
    steamWorkshopService.clearCache();
  }, []);

  return {
    extractWorkshopId,
    loadModTitles,
    loadModInfo,
    getModTitle,
    getModDescription,
    getModInfo,
    isModLoading,
    refreshModTitles,
    clearCache,
    modCache,
    loading: loading.size > 0,
  };
};
