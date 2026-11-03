import { describe, expect, it } from "vite-plus/test";

import { clientIdIn, scriptsOf } from "./client-id.server";
import { tagListOf, trackOf } from "./subjects";

describe("tagListOf", () => {
  it("keeps quoted tags whole", () => {
    expect(tagListOf('vocaloid "hatsune miku" 初音ミク')).toStrictEqual([
      "vocaloid",
      "hatsune miku",
      "初音ミク",
    ]);
  });
});

describe("trackOf", () => {
  it("credits the uploader and puts the genre first in tags", () => {
    expect(
      trackOf({
        id: 123,
        title: "曲",
        permalink_url: "https://soundcloud.com/someone/song",
        full_duration: 180_400,
        genre: "Electronic",
        tag_list: "electronic chill",
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
      tags: ["Electronic", "electronic", "chill"],
    });
  });
});

describe("client_id", () => {
  it("looks through the asset scripts from the last one", () => {
    const page =
      '<script crossorigin src="https://a-v2.sndcdn.com/assets/0-a.js"></script><script crossorigin src="https://a-v2.sndcdn.com/assets/49-b.js"></script>';
    expect(scriptsOf(page)).toStrictEqual([
      "https://a-v2.sndcdn.com/assets/49-b.js",
      "https://a-v2.sndcdn.com/assets/0-a.js",
    ]);
    expect(clientIdIn('x={client_id:"AbC123",env:"production"}')).toMatchObject({
      value: "AbC123",
    });
  });
});
