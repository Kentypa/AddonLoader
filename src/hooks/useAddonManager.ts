import { useState, useCallback, useRef } from "react";
import { join } from "@tauri-apps/api/path";
import { open, message } from "@tauri-apps/plugin-dialog";
import {
  readDir,
  mkdir,
  remove,
  copyFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useSteamWorkshop } from "./useSteamWorkshop";
import type { AddonOrder } from "../types/addonOrder";

function convertLfToCrlf(text: string) {
  return text.replace(/(?<!\r)\n/g, "\r\n");
}

export const useAddonManager = () => {
  const [gamePath, setGamePath] = useState(
    localStorage.getItem("l4d2Path") || ""
  );
  const [addons, setAddons] = useState<string[]>([]);
  const [addonImages, setAddonImages] = useState<Record<string, string>>({});
  const [addonOrder, setAddonOrder] = useState<AddonOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [l4d2Running, setL4d2Running] = useState(false);

  const addonOrderRef = useRef(addonOrder);
  addonOrderRef.current = addonOrder;

  const gamePathRef = useRef(gamePath);
  gamePathRef.current = gamePath;

  const { loadModTitles } = useSteamWorkshop();

  const generateAddonId = useCallback((existingOrder: AddonOrder[]) => {
    const usedIds = new Set(existingOrder.map((item) => item.addonId));
    let counter = 1;
    while (usedIds.has(`addon${counter}`)) counter++;
    return `addon${counter}`;
  }, []);

  const getSelectedAddons = useCallback((orderArray: AddonOrder[]) => {
    return orderArray
      .filter((item) => item.enabled)
      .sort((a, b) => a.order - b.order)
      .map((item) => item.addonId);
  }, []);

  const updateGameInfo = useCallback(
    async (running: boolean, orderArray: AddonOrder[]) => {
      const path = gamePathRef.current;
      if (!path) return;

      try {
        const gameInfoPath = await join(path, "left4dead2", "gameinfo.txt");
        let additionalStrings = "";
        if (!running) {
          const selectedAddonIds = getSelectedAddons(orderArray);
          if (selectedAddonIds.length > 0) {
            const indent = "\t\t\t";
            additionalStrings = selectedAddonIds
              .map((addonId) => `${indent}Game\t\t\t\t${addonId}`)
              .join("\n");
            additionalStrings = "\n" + additionalStrings;
          }
        }

        const finalContent = `"GameInfo"
{
	game	"Left 4 Dead 2"	// Window title
	type multiplayer_only
	nomodels 1
	nohimodel 1
	l4dcrosshair 1
	hidden_maps
	{
		"test_speakers"			1
		"test_hardware"			1
	}
	nodegraph 0
	perfwizard 0
	SupportsXbox360 1
	SupportsDX8	0
	GameData	"left4dead2.fgd"

	FileSystem
	{
		SteamAppId				550		// This will mount all the GCFs we need (240=CS:S, 220=HL2).
		ToolsAppId				563		// Tools will load this (ie: source SDK caches) to get things like materials\\debug, materials\\editor, etc.
		
		//
		// The code that loads this file automatically does a few things here:
		//
		// 1. For each "Game" search path, it adds a "GameBin" path, in <dir>\\bin
		// 2. For each "Game" search path, it adds another "Game" path in front of it with _<langage> at the end.
		//    For example: c:\\hl2\\cstrike on a french machine would get a c:\\hl2\\cstrike_french path added to it.
		// 3. For the first "Game" search path, it adds a search path called "MOD".
		// 4. For the first "Game" search path, it adds a search path called "DEFAULT_WRITE_PATH".
		//

		//
		// Search paths are relative to the base directory, which is where hl2.exe is found.
		//
		// |gameinfo_path| points at the directory where gameinfo.txt is.
		// We always want to mount that directory relative to gameinfo.txt, so
		// people can mount stuff in c:\\mymod, and the main game resources are in
		// someplace like c:\\program files\\valve\\steam\\steamapps\\<username>\\half-life 2.
		//
		SearchPaths
		{${additionalStrings}
			Game				update
			Game				left4dead2_dlc3
			Game				left4dead2_dlc2
			Game				left4dead2_dlc1
			Game				|gameinfo_path|.
			Game				hl2
		}
	}
}\n`;

        await writeTextFile(gameInfoPath, convertLfToCrlf(finalContent));
        console.log("gameinfo.txt updated", {
          running,
          selectedCount: getSelectedAddons(orderArray).length,
        });
      } catch (err) {
        console.error("Error at update gameinfo.txt:", err);
        setError(`Error at update gameinfo.txt: ${err}`);
      }
    },
    [getSelectedAddons]
  );

  const loadAddons = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      try {
        const workshopPath = await join(
          path,
          "left4dead2",
          "addons",
          "workshop"
        );
        const allEntries = await readDir(workshopPath);
        const vpkFiles = allEntries.filter((e) => e.name?.endsWith(".vpk"));
        const addonNames = vpkFiles.map((e) => e.name!);
        setAddons(addonNames);

        const images: Record<string, string> = {};
        const allFileNames = new Set(allEntries.map((e) => e.name));
        for (const vpkName of addonNames) {
          const imageName = vpkName.replace(".vpk", ".jpg");
          if (allFileNames.has(imageName)) {
            const imageFullPath = await join(workshopPath, imageName);
            images[vpkName] = convertFileSrc(imageFullPath);
          }
        }
        setAddonImages(images);

        if (addonNames.length > 0) {
          loadModTitles(addonNames).catch(console.error);
        }

        setAddonOrder((prevOrder) => {
          const existingNames = new Set(prevOrder.map((item) => item.name));
          const newAddons = addonNames.filter(
            (name) => !existingNames.has(name)
          );
          const validExisting = prevOrder.filter((item) =>
            addonNames.includes(item.name)
          );

          const newAddonItems: AddonOrder[] = [];
          const tempList = [...validExisting];

          for (const [index, name] of newAddons.entries()) {
            const addon: AddonOrder = {
              name,
              order:
                (tempList.length
                  ? Math.max(...tempList.map((i) => i.order))
                  : 0) +
                index +
                1,
              enabled: false,
              addonId: generateAddonId(tempList),
            };
            tempList.push(addon);
            newAddonItems.push(addon);
          }

          return [...validExisting, ...newAddonItems];
        });
      } catch (e) {
        console.error(e);
        setAddons([]);
        setAddonImages({});
        setError("Cant select addons, check path or permissions.");
        await message("Cant select addons, check path or permissions", {
          title: "Error",
        });
      } finally {
        setLoading(false);
      }
    },
    [generateAddonId, loadModTitles]
  );

  const restoreSelectedAddons = useCallback(() => {
    const saved = localStorage.getItem("addonOrder");
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved) as AddonOrder[];
        const fixedOrder: AddonOrder[] = [];
        for (const item of savedOrder) {
          let addonId = item.addonId;
          if (!addonId) addonId = generateAddonId(fixedOrder);
          fixedOrder.push({ ...item, addonId });
        }
        setAddonOrder(fixedOrder);
      } catch {
        localStorage.removeItem("addonOrder");
        setAddonOrder([]);
      }
    }
  }, [generateAddonId]);

  const toggleAddon = useCallback(
    async (vpkName: string) => {
      const path = gamePathRef.current;
      if (!path) return;
      const workshopPath = await join(path, "left4dead2", "addons", "workshop");
      const sourceVpkPath = await join(workshopPath, vpkName);

      const currentOrder = [...addonOrderRef.current];
      const addonIndex = currentOrder.findIndex(
        (item) => item.name === vpkName
      );
      if (addonIndex === -1) return;

      const addonItem = currentOrder[addonIndex];
      const isCurrentlyEnabled = addonItem.enabled;
      const targetAddonDir = await join(path, addonItem.addonId);
      const targetVpkPath = await join(targetAddonDir, "pak01_dir.vpk");

      try {
        if (isCurrentlyEnabled) {
          await remove(targetAddonDir, { recursive: true });
          currentOrder[addonIndex].enabled = false;
        } else {
          await mkdir(targetAddonDir, { recursive: true });
          await copyFile(sourceVpkPath, targetVpkPath);
          currentOrder[addonIndex].enabled = true;
        }

        setAddonOrder(currentOrder);
        localStorage.setItem("addonOrder", JSON.stringify(currentOrder));
        await updateGameInfo(l4d2Running, currentOrder);
      } catch (err) {
        console.error(`Error at addon changing ${vpkName}:`, err);
        setError(`Error at addon changing ${vpkName}: ${err}`);
      }
    },
    [updateGameInfo, l4d2Running]
  );

  const moveAddon = useCallback(
    async (vpkName: string, direction: "up" | "down") => {
      const path = gamePathRef.current;
      if (!path) return;

      setAddonOrder((prevOrder) => {
        const newOrder = [...prevOrder];
        const index = newOrder.findIndex((item) => item.name === vpkName);
        if (index === -1) return prevOrder;

        if (direction === "up" && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [
            newOrder[index - 1],
            newOrder[index],
          ];
        } else if (direction === "down" && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [
            newOrder[index + 1],
            newOrder[index],
          ];
        }
        newOrder.forEach((item, idx) => (item.order = idx));
        localStorage.setItem("addonOrder", JSON.stringify(newOrder));
        updateGameInfo(l4d2Running, newOrder).catch(console.error);
        return newOrder;
      });
    },
    [l4d2Running, updateGameInfo]
  );

  const recreateActiveAddons = useCallback(async () => {
    const path = gamePathRef.current;
    if (!path) return;
    const workshopPath = await join(path, "left4dead2", "addons", "workshop");

    for (const addonItem of addonOrderRef.current) {
      if (!addonItem.enabled) continue;
      try {
        const sourceVpkPath = await join(workshopPath, addonItem.name);
        const targetAddonDir = await join(path, addonItem.addonId);
        const targetVpkPath = await join(targetAddonDir, "pak01_dir.vpk");
        try {
          await remove(targetAddonDir, { recursive: true });
        } catch (err) {
          console.error(`Error recreating addon ${addonItem.name}:`, err);
        }
        await mkdir(targetAddonDir, { recursive: true });
        await copyFile(sourceVpkPath, targetVpkPath);
      } catch (err) {
        console.error(`Error recreating addon ${addonItem.name}:`, err);
      }
    }
  }, []);

  const chooseDir = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose folder with game(Left 4 Dead 2)",
    });
    if (selected && typeof selected === "string") {
      localStorage.setItem("l4d2Path", selected);
      setGamePath(selected);
      await loadAddons(selected);
      restoreSelectedAddons();
    }
  }, [loadAddons, restoreSelectedAddons]);

  const clearPath = useCallback(() => {
    localStorage.removeItem("l4d2Path");
    localStorage.removeItem("addonOrder");
    setGamePath("");
    setAddons([]);
    setAddonImages({});
    setAddonOrder([]);
    setError(null);
  }, []);

  const toggleGameRunning = useCallback(() => {
    const newState = !l4d2Running;
    setL4d2Running(newState);
    updateGameInfo(newState, addonOrderRef.current).catch(console.error);
  }, [l4d2Running, updateGameInfo]);

  return {
    gamePath,
    addons,
    addonImages,
    addonOrder,
    loading,
    error,
    l4d2Running,

    loadAddons,
    restoreSelectedAddons,
    toggleAddon,
    moveAddon,
    recreateActiveAddons,
    chooseDir,
    clearPath,
    toggleGameRunning,
    updateGameInfo,
    addonOrderRef,
    selectedCount: addonOrder.filter((item) => item.enabled).length,
  };
};
