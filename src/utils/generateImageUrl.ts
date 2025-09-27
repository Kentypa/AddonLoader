import { convertFileSrc } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";

export const generateImageUrl = async (
  workshopPath: string,
  imageName: string
) => {
  const imageFullPath = await join(workshopPath, imageName);
  return convertFileSrc(imageFullPath);
};
