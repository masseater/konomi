import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { clockSecondsOf, likedVideoOf, playlistVideoOf } from "./subjects";

const HOUR_MINUTE_SECOND = 3723;
const FOUR_FIVE = 245;

describe("durations", () => {
  it("reads clock durations", () => {
    expect(clockSecondsOf("1:02:03")).toStrictEqual(Option.some(HOUR_MINUTE_SECOND));
    expect(clockSecondsOf("4:05")).toStrictEqual(Option.some(FOUR_FIVE));
    expect(clockSecondsOf("ライブ")).toStrictEqual(Option.none());
  });
});

describe("likedVideoOf", () => {
  it("credits the channel and keeps tags", () => {
    expect(
      likedVideoOf({
        id: "dQw4w9WgXcQ",
        snippet: {
          title: "曲",
          channelId: "UC1",
          channelTitle: "チャンネル",
          publishedAt: "2009-10-25T06:57:33Z",
          tags: ["ボカロ"],
        },
        contentDetails: { duration: "PT3M33S" },
      }),
    ).toStrictEqual({
      provider: "youtube",
      externalId: "dQw4w9WgXcQ",
      type: "video",
      title: "曲",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      durationSec: 213,
      publishedAtMs: 1_256_453_853_000,
      credits: [
        {
          provider: "youtube",
          externalId: "UC1",
          type: "channel",
          title: "チャンネル",
          url: "https://www.youtube.com/channel/UC1",
        },
      ],
      tags: ["ボカロ"],
    });
  });
});

describe("playlistVideoOf", () => {
  it("skips deleted and private videos that have no owner", () => {
    expect(
      playlistVideoOf({ snippet: { title: "Deleted video", resourceId: { videoId: "x1" } } }),
    ).toStrictEqual(Option.none());
  });
});
