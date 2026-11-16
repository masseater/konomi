import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { songOf } from "./subjects";

describe("songOf", () => {
  it("uses the catalog id of a library song and drops the generic genre", () => {
    expect(
      songOf({
        storefront: "jp",
        song: {
          id: "i.abc",
          type: "library-songs",
          attributes: {
            name: "曲",
            artistName: "歌い手",
            genreNames: ["J-Pop", "ミュージック"],
            durationInMillis: 200_400,
            releaseDate: "2020-05-06",
            dateAdded: "2024-01-01T00:00:00Z",
            playParams: { id: "i.abc", catalogId: "1500000000" },
          },
        },
      }),
    ).toStrictEqual(
      Option.some({
        provider: "apple-music",
        externalId: "1500000000",
        type: "track",
        title: "曲",
        url: "https://music.apple.com/jp/song/1500000000",
        durationSec: 200,
        publishedAtMs: 1_588_723_200_000,
        credits: [
          {
            provider: "apple-music",
            externalId: "artist:歌い手",
            type: "person",
            title: "歌い手",
            url: "https://music.apple.com/jp/search?term=%E6%AD%8C%E3%81%84%E6%89%8B",
          },
        ],
        tags: ["J-Pop"],
      }),
    );
  });
});
