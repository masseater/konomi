import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { followedArtistOf, trackOf } from "./subjects";

describe("trackOf", () => {
  it("credits each artist and keeps a full release date", () => {
    const subject = trackOf({
      id: "4uLU6hMCjMI75M1A2tKUQC",
      type: "track",
      name: "Never Gonna Give You Up",
      duration_ms: 213_573,
      external_urls: { spotify: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" },
      artists: [{ id: "0gxyHStUsqpMadRV0Di1Qt", name: "Rick Astley" }, { name: "local" }],
      album: { release_date: "1987-11-12" },
    });
    expect(subject).toStrictEqual(
      Option.some({
        provider: "spotify",
        externalId: "4uLU6hMCjMI75M1A2tKUQC",
        type: "track",
        title: "Never Gonna Give You Up",
        url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
        durationSec: 214,
        publishedAtMs: 563_673_600_000,
        credits: [
          {
            provider: "spotify",
            externalId: "0gxyHStUsqpMadRV0Di1Qt",
            type: "person",
            title: "Rick Astley",
            url: "https://open.spotify.com/artist/0gxyHStUsqpMadRV0Di1Qt",
          },
        ],
        tags: [],
      }),
    );
  });

  it("skips local files and drops a year-only release date", () => {
    expect(trackOf({ name: "local file" })).toStrictEqual(Option.none());
    const episode = trackOf({
      id: "ep1",
      type: "episode",
      name: "回",
      album: { release_date: "2020" },
    });
    expect(Option.getOrThrow(episode)).toMatchObject({
      type: "episode",
      url: "https://open.spotify.com/episode/ep1",
    });
    expect(Option.getOrThrow(episode)).not.toHaveProperty("publishedAtMs");
  });
});

describe("followedArtistOf", () => {
  it("turns genres into tags", () => {
    expect(
      followedArtistOf({ id: "a1", name: "ずっと真夜中でいいのに。", genres: ["j-pop"] }),
    ).toStrictEqual(
      Option.some({
        provider: "spotify",
        externalId: "a1",
        type: "person",
        title: "ずっと真夜中でいいのに。",
        url: "https://open.spotify.com/artist/a1",
        credits: [],
        tags: ["j-pop"],
      }),
    );
  });
});
