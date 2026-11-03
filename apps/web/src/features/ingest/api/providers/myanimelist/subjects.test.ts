import { describe, expect, it } from "vite-plus/test";

import { entryObservationsOf } from "./subjects";

const ANIME_ID = 5114;
const SEASON_YEAR = 2009;
const FETCHED_AT = 0;

describe("entryObservationsOf", () => {
  it("reads an anime entry as a series with its genres and season", () => {
    const observations = entryObservationsOf({ list: "anime", fetchedAt: FETCHED_AT })({
      node: {
        id: ANIME_ID,
        title: "Fullmetal Alchemist: Brotherhood",
        genres: [{ name: "Action" }],
        start_season: { year: SEASON_YEAR },
      },
      list_status: { status: "completed" },
    });
    expect(observations).toMatchObject([
      {
        kind: "collected",
        subject: {
          provider: "myanimelist",
          externalId: "anime:5114",
          type: "series",
          title: "Fullmetal Alchemist: Brotherhood",
          url: "https://myanimelist.net/anime/5114",
          credits: [],
          tags: ["Action", "2009"],
        },
      },
      { kind: "consumed" },
    ]);
  });
});
