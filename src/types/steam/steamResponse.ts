import type { Publishedfiledetail } from "./publishedFileDetail";

export type SteamResponse = {
  response: {
    result: number;
    resultcount: number;
    publishedfiledetails: Publishedfiledetail[];
  };
};
