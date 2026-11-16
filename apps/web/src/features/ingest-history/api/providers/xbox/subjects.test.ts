import { describe, expect, it } from "vite-plus/test";

import { friendObservationsOf, playedObservationsOf } from "./subjects";

const PLAYED_AT = "2026-10-26T02:34:30.2229199Z";
const FETCHED_AT = 0;

describe("playedObservationsOf", () => {
  it("records a play of each game at the last played time", () => {
    const titles = [
      {
        titleId: "1144039928",
        name: "Halo",
        type: "Game",
        titleHistory: { lastTimePlayed: PLAYED_AT },
      },
      { titleId: "1", name: "Netflix", type: "App", titleHistory: { lastTimePlayed: PLAYED_AT } },
      { titleId: "2", name: "Unplayed", type: "Game" },
    ];
    expect(playedObservationsOf(titles)).toStrictEqual([
      {
        kind: "consumed",
        occurredAtMs: Date.parse(PLAYED_AT),
        subject: {
          provider: "xbox",
          externalId: "title:1144039928",
          type: "game",
          title: "Halo",
          url: "https://www.xbox.com/search?q=Halo",
          credits: [],
          tags: [],
        },
      },
    ]);
  });
});

describe("friendObservationsOf", () => {
  it("follows each friend by gamertag", () => {
    expect(
      friendObservationsOf(FETCHED_AT)([{ xuid: "25", gamertag: "Best Friend" }]),
    ).toMatchObject([
      {
        kind: "followed",
        subject: { externalId: "user:25", url: "https://www.xbox.com/play/user/Best%20Friend" },
      },
    ]);
  });
});
