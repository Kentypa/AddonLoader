import { useState, useCallback, useRef, useEffect } from "react";
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

function convertLfToCrlf(text: string) {
  return text.replace(/(?<!\r)\n/g, "\r\n");
}

interface AddonOrder {
  name: string;
  order: number;
  enabled: boolean;
  addonId: string;
}

export default function App() {
  const [gamePath, setGamePath] = useState(
    localStorage.getItem("l4d2Path") || ""
  );
  const [, setAddons] = useState<string[]>([]);
  const [addonImages, setAddonImages] = useState<Record<string, string>>({});
  const [addonOrder, setAddonOrder] = useState<AddonOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [l4d2Running, setL4d2Running] = useState(false);

  const addonOrderRef = useRef(addonOrder);
  addonOrderRef.current = addonOrder;

  const gamePathRef = useRef(gamePath);
  gamePathRef.current = gamePath;

  const generateAddonId = useCallback((existingOrder: AddonOrder[]) => {
    const usedIds = new Set(existingOrder.map((item) => item.addonId));
    let counter = 1;
    while (usedIds.has(`addon${counter}`)) counter++;
    return `addon${counter}`;
  }, []);

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
    [generateAddonId]
  );

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

  const toggleGameRunning = useCallback(() => {
    const newState = !l4d2Running;
    setL4d2Running(newState);
    updateGameInfo(newState, addonOrderRef.current).catch(console.error);
  }, [l4d2Running, updateGameInfo]);

  useEffect(() => {
    if (!gamePath) return;

    const init = async () => {
      try {
        await loadAddons(gamePath);

        restoreSelectedAddons();

        setTimeout(() => {
          updateGameInfo(false, addonOrderRef.current).catch(console.error);
        }, 0);
      } catch (err) {
        console.error("Error on init:", err);
      }
    };

    init();
  }, [gamePath, loadAddons, restoreSelectedAddons, updateGameInfo]);

  const selectedCount = addonOrder.filter((item) => item.enabled).length;

  return (
    <main className="p-6 max-w-4xl mx-auto font-sans bg-gray-900 text-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-green-400">
        L4D2 Addon Loader
      </h1>

      <div className="mb-4">
        <p className="mb-1">
          <strong>Game Status:</strong>{" "}
          <span
            className={
              l4d2Running
                ? "text-green-400 font-bold"
                : "text-red-500 font-bold"
            }
          >
            {l4d2Running ? "Running" : "Not Running"}
          </span>
        </p>
        <p className="text-sm text-gray-400">
          <strong>Selected Addons:</strong> {selectedCount}
        </p>
        <button
          onClick={toggleGameRunning}
          className="mt-2 px-4 py-2 bg-indigo-700 text-white rounded hover:bg-indigo-600 transition"
        >
          {l4d2Running ? "Set Not Running" : "Set Running"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-800 text-red-300 rounded mb-4">{error}</div>
      )}

      {!gamePath ? (
        <button
          onClick={chooseDir}
          className="px-5 py-2 bg-blue-700 text-white rounded hover:bg-blue-600 transition"
        >
          Select Game Folder
        </button>
      ) : (
        <>
          <p className="mb-3 text-gray-300">
            <strong>Current Path:</strong> {gamePath}
          </p>
          <div className="flex gap-3 mb-5">
            <button
              onClick={chooseDir}
              className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 transition"
            >
              Change Folder
            </button>
            <button
              onClick={clearPath}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition"
            >
              Clear
            </button>
            <button
              onClick={recreateActiveAddons}
              className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-600 transition"
              title="Recreate all active addon directories"
            >
              Refresh Addons
            </button>
          </div>

          <h2 className="text-2xl font-semibold mb-4 text-green-300">
            Detected Addons:
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading addons...</span>
            </div>
          ) : addonOrder.length > 0 ? (
            <div className="flex flex-col gap-3">
              {addonOrder.map((addonItem, index) => {
                const vpkName = addonItem.name;
                const imageUrl = addonImages[vpkName];
                const isSelected = addonItem.enabled;
                return (
                  <div
                    key={vpkName}
                    className={`flex items-center gap-3 p-3 border rounded transition ${
                      isSelected
                        ? "border-green-500 bg-gray-800"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveAddon(vpkName, "up")}
                        disabled={index === 0}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <span className="text-xs text-gray-500 text-center">
                        {index + 1}
                      </span>
                      <button
                        onClick={() => moveAddon(vpkName, "down")}
                        disabled={index === addonOrder.length - 1}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAddon(vpkName)}
                      className="w-5 h-5"
                    />

                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={vpkName}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-400"
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

                    <div className="flex-1 text-gray-200">
                      <span className="break-all font-medium">
                        {vpkName.replace(".vpk", "")}
                      </span>
                      {isSelected && (
                        <div className="text-xs text-green-400">
                          ✓ Active as{" "}
                          <span className="font-mono">{addonItem.addonId}</span>{" "}
                          (Priority: {index + 1})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400">
              No addons found. Please check your game folder.
            </p>
          )}
        </>
      )}
    </main>
  );
}
