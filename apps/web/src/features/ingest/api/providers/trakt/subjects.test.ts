import { describe, expect, it } from "vite-plus/test";

import { historyObservationsOf } from "./subjects";

const SHOW_ID = 1;
const EPISODE_ID = 2;
const SEASON = 3;
const EPISODE = 4;
const YEAR = 2008;
const FETCHED_AT = 0;

describe("historyObservationsOf", () => {
  it("names an episode after its show, season and number", () => {
    const observations = historyObservationsOf(FETCHED_AT)([
      {
        watched_at: "2026-01-01T00:00:00Z",
        show: { title: "Breaking Bad", year: YEAR, ids: { trakt: SHOW_ID, slug: "breaking-bad" } },
        episode: { season: SEASON, number: EPISODE, title: "Pilot", ids: { trakt: EPISODE_ID } },
      },
    ]);
    expect(observations).toMatchObject([
      {
        subject: {
          provider: "trakt",
          externalId: "episode:2",
          type: "episode",
          title: "Breaking Bad S3E4 Pilot",
          url: "https://trakt.tv/shows/breaking-bad/seasons/3/episodes/4",
          credits: [],
          tags: ["Breaking Bad", "2008"],
        },
      },
    ]);
  });
});
