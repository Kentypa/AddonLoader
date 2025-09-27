import type { CachedModInfo } from "../types/steam/cachedModInfo";
import type { Publishedfiledetail } from "../types/steam/publishedFileDetail";
import type { SteamResponse } from "../types/steam/steamResponse";
import { fetch } from "@tauri-apps/plugin-http";

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY = "steam-workshop-cache";
const MAX_IDS_PER_REQUEST = 100;

export class SteamWorkshopService {
  private getCache(): Record<string, CachedModInfo> {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }

  private setCache(cache: Record<string, CachedModInfo>): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("Failed to save cache:", error);
    }
  }

  private isCacheValid(cachedItem: CachedModInfo): boolean {
    return Date.now() - cachedItem.lastUpdated < CACHE_DURATION;
  }

  extractWorkshopId(filename: string): string | null {
    const match = filename.match(/(?:addon_|workshop_)?(\d+)\.vpk/);
    return match ? match[1] : null;
  }

  extractWorkshopIds(filenames: string[]): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();

    for (const filename of filenames) {
      const workshopId = this.extractWorkshopId(filename);
      if (workshopId && !seen.has(workshopId)) {
        ids.push(workshopId);
        seen.add(workshopId);
      }
    }

    return ids;
  }

  async getModTitlesBatch(
    filenames: string[]
  ): Promise<Record<string, string>> {
    const workshopIds = this.extractWorkshopIds(filenames);

    if (workshopIds.length === 0) {
      return {};
    }

    const results: Record<string, string> = {};
    const cache = this.getCache();
    let cacheUpdated = false;

    for (const workshopId of workshopIds) {
      if (cache[workshopId] && this.isCacheValid(cache[workshopId])) {
        results[workshopId] = cache[workshopId].title;
      }
    }

    const idsToFetch: string[] = workshopIds.filter(
      (id) => !cache[id] || !this.isCacheValid(cache[id])
    );

    if (idsToFetch.length > 0) {
      for (const idGroup of this.chunkArray(idsToFetch, MAX_IDS_PER_REQUEST)) {
        try {
          const batchResults = await this.fetchModTitlesFromSteam(idGroup);

          for (const [workshopId, title] of Object.entries(batchResults)) {
            cache[workshopId] = {
              title,
              lastUpdated: Date.now(),
              workshopId,
            };
            results[workshopId] = title;
            cacheUpdated = true;
          }
        } catch (error) {
          console.error("Failed to fetch batch titles:", error);
          for (const workshopId of idGroup) {
            if (!results[workshopId]) {
              results[workshopId] = workshopId;
            }
          }
        }
      }
    }

    if (cacheUpdated) {
      this.setCache(cache);
    }

    return results;
  }

  private async fetchModTitlesFromSteam(
    workshopIds: string[]
  ): Promise<Record<string, string>> {
    const formData = new FormData();
    formData.append("itemcount", workshopIds.length.toString());

    workshopIds.forEach((id, index) => {
      formData.append(`publishedfileids[${index}]`, id);
    });

    const response = await fetch(
      "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SteamResponse = await response.json();

    if (data.response.result !== 1) {
      throw new Error("Invalid response from Steam API");
    }

    const results: Record<string, string> = {};

    for (const item of data.response.publishedfiledetails) {
      if (item.result === 1 && item.title) {
        results[item.publishedfileid] = item.title;
      }
    }

    return results;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async getModTitle(filename: string): Promise<string> {
    const titles = await this.getModTitlesBatch([filename]);
    return titles[filename];
  }

  async refreshModTitles(filenames: string[]): Promise<Record<string, string>> {
    const cache = this.getCache();

    for (const filename of filenames) {
      const workshopId = this.extractWorkshopId(filename);
      if (workshopId && cache[workshopId]) {
        delete cache[workshopId];
      }
    }

    this.setCache(cache);

    return this.getModTitlesBatch(filenames);
  }

  async getModDetails(workshopId: string): Promise<Publishedfiledetail | null> {
    try {
      const formData = new FormData();
      formData.append("itemcount", "1");
      formData.append("publishedfileids[0]", workshopId);

      const response = await fetch(
        "/steamapi/ISteamRemoteStorage/GetPublishedFileDetails/v1/",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data: SteamResponse = await response.json();

      if (
        data.response.result === 1 &&
        data.response.publishedfiledetails.length > 0
      ) {
        return data.response.publishedfiledetails[0];
      }
    } catch (error) {
      console.error("Failed to fetch mod details:", error);
    }

    return null;
  }

  cleanupExpiredCache(): void {
    const cache = this.getCache();
    let hasChanges = false;

    for (const [workshopId, cachedItem] of Object.entries(cache)) {
      if (!this.isCacheValid(cachedItem)) {
        delete cache[workshopId];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.setCache(cache);
    }
  }

  getCacheStats(): { total: number; valid: number } {
    const cache = this.getCache();
    let valid = 0;

    for (const cachedItem of Object.values(cache)) {
      if (this.isCacheValid(cachedItem)) {
        valid++;
      }
    }

    return { total: Object.keys(cache).length, valid };
  }

  clearCache(): void {
    localStorage.removeItem(CACHE_KEY);
  }
}

export const steamWorkshopService = new SteamWorkshopService();
