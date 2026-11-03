import { describe, expect, it } from "vite-plus/test";

import { entryOf } from "./subjects";

const ANIME_ID = 5114;
const SEASON_YEAR = 2009;

describe("entryOf", () => {
  it("reads an anime entry as a series with its genres and season", () => {
    expect(
      entryOf("anime")({
        node: {
          id: ANIME_ID,
          title: "Fullmetal Alchemist: Brotherhood",
          genres: [{ name: "Action" }],
          start_season: { year: SEASON_YEAR },
        },
        list_status: { status: "completed" },
      }),
    ).toStrictEqual({
      provider: "myanimelist",
      externalId: "anime:5114",
      type: "series",
      title: "Fullmetal Alchemist: Brotherhood",
      url: "https://myanimelist.net/anime/5114",
      credits: [],
      tags: ["Action", "2009"],
    });
  });
});
