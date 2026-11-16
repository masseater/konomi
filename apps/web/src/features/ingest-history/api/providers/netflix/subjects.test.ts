import { describe, expect, it } from "vite-plus/test";

import type { ActivityRow } from "./schemas";
import { activityObservationsOf } from "./subjects";

const STARTED_AT = Date.parse("2026-10-23T12:34:56Z");

const rowOf = (fields: Partial<ActivityRow>): ActivityRow => ({
  "Profile Name": "masseater",
  "Start Time": "2026-10-23 12:34:56",
  Duration: "00:42:10",
  Attributes: "",
  Title: "Stranger Things: Season 1: Chapter One: The Vanishing of Will Byers",
  "Supplemental Video Type": "",
  ...fields,
});

describe("activityObservationsOf", () => {
  it("records an episode at the UTC start time with the series as a tag", () => {
    expect(activityObservationsOf({ rows: [rowOf({})], profile: "" })).toStrictEqual([
      {
        kind: "consumed",
        occurredAtMs: STARTED_AT,
        subject: {
          provider: "netflix",
          externalId: "title:Stranger Things: Season 1: Chapter One: The Vanishing of Will Byers",
          type: "episode",
          title: "Stranger Things: Season 1: Chapter One: The Vanishing of Will Byers",
          url: "https://www.netflix.com/search?q=Stranger%20Things",
          credits: [],
          tags: ["Stranger Things"],
        },
      },
    ]);
  });

  it("records a title without seasons as a video", () => {
    const observations = activityObservationsOf({
      rows: [rowOf({ Title: "Glass Onion: A Knives Out Mystery" })],
      profile: "",
    });
    expect(observations).toMatchObject([{ subject: { type: "video", tags: [] } }]);
  });

  it("skips trailers, autoplayed previews and plays shorter than a minute", () => {
    const rows = [
      rowOf({ "Supplemental Video Type": "TRAILER" }),
      rowOf({ Attributes: "Autoplayed: user action: None; " }),
      rowOf({ Duration: "00:00:59" }),
    ];
    expect(activityObservationsOf({ rows, profile: "" })).toStrictEqual([]);
  });

  it("keeps only the named profile when one is given", () => {
    const rows = [rowOf({}), rowOf({ "Profile Name": "family" })];
    expect(activityObservationsOf({ rows, profile: "family" })).toMatchObject([
      { subject: { provider: "netflix" } },
    ]);
  });
});
