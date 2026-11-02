import { describe, expect, it } from "vite-plus/test";

import { stampOf, videoSubjectOf } from "./subjects";

const FETCHED_AT = 1_700_000_000_000;

describe("videoSubjectOf", () => {
  it("credits a user owner as a person", () => {
    const subject = videoSubjectOf({
      video: {
        id: "sm9",
        title: "新・豪血寺一族 -煩悩解放 - レッツゴー！陰陽師",
        registeredAt: "2007-03-06T00:33:00+09:00",
        duration: 320,
        owner: { ownerType: "user", id: "4", name: "中の" },
      },
    });
    expect(subject).toStrictEqual({
      provider: "niconico",
      externalId: "sm9",
      type: "video",
      title: "新・豪血寺一族 -煩悩解放 - レッツゴー！陰陽師",
      url: "https://www.nicovideo.jp/watch/sm9",
      durationSec: 320,
      publishedAtMs: 1_173_108_780_000,
      credits: [
        {
          provider: "niconico",
          externalId: "4",
          type: "person",
          title: "中の",
          url: "https://www.nicovideo.jp/user/4",
        },
      ],
      tags: [],
    });
  });
});

describe("videoSubjectOf owners", () => {
  it("credits a channel owner as a channel and skips a hidden owner", () => {
    const channel = videoSubjectOf({
      video: { id: "so1", title: "a", owner: { ownerType: "channel", id: "ch1", name: "c" } },
    });
    const hidden = videoSubjectOf({
      video: { id: "sm1", title: "b", owner: { ownerType: "hidden" } },
    });
    expect(channel.credits).toStrictEqual([
      {
        provider: "niconico",
        externalId: "ch1",
        type: "channel",
        title: "c",
        url: "https://ch.nicovideo.jp/ch1",
      },
    ]);
    expect(hidden.credits).toStrictEqual([]);
  });
});

describe("stampOf", () => {
  it("uses the first time the listing reports", () => {
    expect(
      stampOf({
        entry: { video: { id: "sm9", title: "a" }, likedAt: "2026-11-01T00:00:00Z" },
        fallback: FETCHED_AT,
      }),
    ).toBe(Date.parse("2026-11-01T00:00:00Z"));
  });

  it("falls back to the fetch time", () => {
    expect(stampOf({ entry: { video: { id: "sm9", title: "a" } }, fallback: FETCHED_AT })).toBe(
      FETCHED_AT,
    );
  });
});
