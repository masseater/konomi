import { Array as Arr, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import type { ViewingRow } from "./schemas";
import { viewingObservationsOf } from "./subjects";

const rowOf = (fields: Partial<ViewingRow>): ViewingRow => ({
  Title: "The Boys: Season 3: Episode 5",
  "Playback Start Datetime (UTC)": "2026-10-20 12:00:00",
  "Playback End Datetime (UTC)": "2026-10-20 13:00:00",
  "Seconds Viewed": "3600",
  "Material Type Description": "Feature",
  ...fields,
});

describe("viewingObservationsOf", () => {
  it("records an episode at the UTC start with the series as a tag", () => {
    expect(viewingObservationsOf([rowOf({})])).toStrictEqual([
      {
        kind: "consumed",
        occurredAtMs: Date.parse("2026-10-20T12:00:00Z"),
        subject: {
          provider: "prime-video",
          externalId: "title:The Boys: Season 3: Episode 5",
          type: "episode",
          title: "The Boys: Season 3: Episode 5",
          url: "https://www.amazon.co.jp/s?k=The%20Boys&i=instant-video",
          credits: [],
          tags: ["The Boys"],
        },
      },
    ]);
  });

  it("drops promos, trailers and short plays but keeps unmetered long sessions", () => {
    const observations = viewingObservationsOf([
      rowOf({ Title: "Promo", "Material Type Description": "Promo" }),
      rowOf({ Title: "Trailer", "Material Type Description": "Trailer" }),
      rowOf({ Title: "Short", "Seconds Viewed": "20" }),
      rowOf({ Title: "Live", "Seconds Viewed": "0" }),
      rowOf({
        Title: "Abandoned",
        "Seconds Viewed": "0",
        "Playback End Datetime (UTC)": "2026-10-20 12:00:30",
      }),
    ]);
    expect(
      pipe(
        observations,
        Arr.map(({ subject }) => subject.title),
      ),
    ).toStrictEqual(["Live"]);
  });
});

describe("viewingObservationsOf with the older export", () => {
  it("reads the older Playback Hour layout and quoted cells", () => {
    const observations = viewingObservationsOf([
      {
        Title: '"Oppenheimer"',
        "Playback Hour": "02/04/2020 01:00:00",
        "Video Type": "Feature",
      },
    ]);
    expect(observations).toMatchObject([
      {
        occurredAtMs: Date.parse("2020-02-04T01:00:00Z"),
        subject: { type: "video", title: "Oppenheimer" },
      },
    ]);
  });
});
