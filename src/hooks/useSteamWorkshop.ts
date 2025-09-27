import { useState, useCallback, useEffect } from "react";
import { steamWorkshopService } from "../services/steamService";
import type { Publishedfiledetail } from "../types/steam/publishedFileDetail";

export function useSteamWorkshop() {
  const [modTitles, setModTitles] = useState<Record<string, string>>({});
  const [modDetails, setModDetails] = useState<
    Record<string, Publishedfiledetail>
  >({});
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const extractWorkshopId = useCallback((filename: string) => {
    return steamWorkshopService.extractWorkshopId(filename);
  }, []);

  const loadModTitles = useCallback(
    async (filenames: string[]) => {
      if (filenames.length === 0) return {};

      setLoading(true);
      setError(null);

      try {
        const titles = await steamWorkshopService.getModTitlesBatch(filenames);
        setModTitles((prev) => ({ ...prev, ...titles }));
        return titles;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load mod titles";
        setError(errorMessage);
        console.error("Error loading mod titles:", err);

        const fallbackTitles: Record<string, string> = {};
        filenames.forEach((filename) => {
          const workshopId = extractWorkshopId(filename);
          if (workshopId) {
            fallbackTitles[workshopId] = filename.replace(".vpk", "");
          }
        });

        setModTitles((prev) => ({ ...prev, ...fallbackTitles }));
        return fallbackTitles;
      } finally {
        setLoading(false);
      }
    },
    [extractWorkshopId]
  );

  const refreshModTitles = useCallback(async (filenames: string[]) => {
    if (filenames.length === 0) return {};

    setRefreshing((prev) => new Set([...prev, ...filenames]));
    setError(null);

    try {
      const titles = await steamWorkshopService.refreshModTitles(filenames);
      setModTitles((prev) => ({ ...prev, ...titles }));
      return titles;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh mod titles";
      setError(errorMessage);
      console.error("Error refreshing mod titles:", err);
      return {};
    } finally {
      setRefreshing((prev) => {
        const newSet = new Set(prev);
        filenames.forEach((filename) => newSet.delete(filename));
        return newSet;
      });
    }
  }, []);

  const refreshSingleModTitle = useCallback(
    async (filename: string) => {
      const titles = await refreshModTitles([filename]);
      const workshopId = extractWorkshopId(filename);
      return workshopId ? titles[workshopId] : undefined;
    },
    [refreshModTitles, extractWorkshopId]
  );

  const getModDetails = useCallback(async (workshopId: string) => {
    setError(null);

    try {
      const details = await steamWorkshopService.getModDetails(workshopId);
      if (details) {
        setModDetails((prev) => ({ ...prev, [workshopId]: details }));
      }
      return details;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get mod details";
      setError(errorMessage);
      console.error("Error getting mod details:", err);
      return null;
    }
  }, []);

  const isTitleLoading = useCallback(
    (filename: string) => {
      return loading || refreshing.has(filename);
    },
    [loading, refreshing]
  );

  const getModTitle = useCallback(
    (filename: string) => {
      const workshopId = extractWorkshopId(filename);
      if (workshopId && modTitles[workshopId]) {
        return modTitles[workshopId];
      }
      return filename.replace(".vpk", "");
    },
    [modTitles, extractWorkshopId]
  );

  const getModDescription = useCallback(
    (filename: string) => {
      const workshopId = extractWorkshopId(filename);
      if (!workshopId) return null;

      const details = modDetails[workshopId];
      return details?.description || null;
    },
    [modDetails, extractWorkshopId]
  );

  useEffect(() => {
    steamWorkshopService.cleanupExpiredCache();
  }, []);

  return {
    modTitles,
    modDetails,
    loading,
    error,
    loadModTitles,
    refreshModTitles,
    refreshSingleModTitle,
    getModDetails,
    isTitleLoading,
    extractWorkshopId,
    getModTitle,
    getModDescription,
    getCacheStats:
      steamWorkshopService.getCacheStats.bind(steamWorkshopService),
    clearCache: steamWorkshopService.clearCache.bind(steamWorkshopService),
  };
}
