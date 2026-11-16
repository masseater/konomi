import { describe, expect, it } from "vite-plus/test";

import { playedObservationsOf } from "./subjects";

const FETCHED_AT = 0;
const CONCEPT = 10_002_694;
const FIRST_PLAYED = 1_767_225_600_000;
const LAST_PLAYED = 1_793_404_800_000;

describe("playedObservationsOf", () => {
  it("collects the game when first played and consumes it when last played", () => {
    expect(
      playedObservationsOf(FETCHED_AT)([
        {
          localizedName: "ASTRO BOT",
          firstPlayedDateTime: "2026-01-01T00:00:00Z",
          lastPlayedDateTime: "2026-10-31T00:00:00Z",
          concept: { id: CONCEPT },
        },
      ]),
    ).toMatchObject([
      {
        kind: "collected",
        occurredAtMs: FIRST_PLAYED,
        subject: {
          provider: "playstation",
          externalId: "10002694",
          type: "game",
          title: "ASTRO BOT",
          url: "https://store.playstation.com/concept/10002694",
        },
      },
      { kind: "consumed", occurredAtMs: LAST_PLAYED },
    ]);
  });
});
