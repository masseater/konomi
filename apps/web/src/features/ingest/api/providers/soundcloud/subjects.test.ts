import { describe, expect, it } from "vite-plus/test";

import { trackOf } from "./subjects";

describe("trackOf", () => {
  it("credits the uploader and puts the genre first in tags", () => {
    expect(
      trackOf({
        id: 123,
        title: "曲",
        permalink_url: "https://soundcloud.com/someone/song",
        full_duration: 180_400,
        genre: "Electronic",
        tag_list: 'electronic "lo fi"',
        display_date: "2024-01-02T03:04:05Z",
        user: { id: 9, username: "someone", permalink_url: "https://soundcloud.com/someone" },
      }),
    ).toStrictEqual({
      provider: "soundcloud",
      externalId: "123",
      type: "track",
      title: "曲",
      url: "https://soundcloud.com/someone/song",
      durationSec: 180,
      publishedAtMs: 1_704_164_645_000,
      credits: [
        {
          provider: "soundcloud",
          externalId: "9",
          type: "person",
          title: "someone",
          url: "https://soundcloud.com/someone",
        },
      ],
      tags: ["Electronic", "electronic", "lo fi"],
    });
  });
});
