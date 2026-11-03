import { describe, expect, it } from "vite-plus/test";

import { mediaOf } from "./subjects";

const MEDIA_ID = 54_705;
const SEASON_YEAR = 2013;

describe("mediaOf", () => {
  it("reads manga as a book and prefers the native title", () => {
    expect(
      mediaOf({
        id: MEDIA_ID,
        siteUrl: "https://anilist.co/manga/54705",
        type: "MANGA",
        seasonYear: SEASON_YEAR,
        title: { romaji: "Aku no Hana", native: "惡の華", english: "The Flowers of Evil" },
        genres: ["Drama"],
      }),
    ).toStrictEqual({
      provider: "anilist",
      externalId: "MANGA:54705",
      type: "book",
      title: "惡の華",
      url: "https://anilist.co/manga/54705",
      credits: [],
      tags: ["Drama", "2013"],
    });
  });
});
