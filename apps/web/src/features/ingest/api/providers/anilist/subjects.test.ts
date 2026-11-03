import { describe, expect, it } from "vite-plus/test";

import { entryObservationsOf } from "./subjects";

const MEDIA_ID = 54_705;
const SEASON_YEAR = 2013;
const FETCHED_AT = 0;
const SCORE = 100;
const UPDATED_AT = 1_451_297_470;

describe("entryObservationsOf", () => {
  it("reads manga as a book and prefers the native title", () => {
    const observations = entryObservationsOf(FETCHED_AT)({
      status: "COMPLETED",
      score: SCORE,
      updatedAt: UPDATED_AT,
      media: {
        id: MEDIA_ID,
        siteUrl: "https://anilist.co/manga/54705",
        type: "MANGA",
        seasonYear: SEASON_YEAR,
        title: { romaji: "Aku no Hana", native: "惡の華", english: "The Flowers of Evil" },
        genres: ["Drama"],
      },
    });
    expect(observations).toMatchObject([
      {
        kind: "collected",
        subject: {
          provider: "anilist",
          externalId: "MANGA:54705",
          type: "book",
          title: "惡の華",
          url: "https://anilist.co/manga/54705",
          credits: [],
          tags: ["Drama", "2013"],
        },
      },
      { kind: "endorsed" },
      { kind: "consumed" },
    ]);
  });
});
