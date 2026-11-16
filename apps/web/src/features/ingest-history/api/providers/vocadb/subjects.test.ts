import { describe, expect, it } from "vite-plus/test";

import { ratedObservationsOf } from "./subjects";

const SONG_ID = 1_023_163;
const ARTIST_ID = 161;
const LENGTH = 222;
const FETCHED_AT = 0;

describe("ratedObservationsOf", () => {
  it("credits the artists and keeps the length and publish date", () => {
    const observations = ratedObservationsOf(FETCHED_AT)([
      {
        date: "2026-09-10T08:50:14.307",
        rating: "Favorite",
        song: {
          id: SONG_ID,
          name: "Anemone",
          lengthSeconds: LENGTH,
          publishDate: "2026-08-28T00:00:00Z",
          songType: "Original",
          artists: [{ artist: { id: ARTIST_ID, name: "無力P" }, categories: "Producer" }],
        },
      },
    ]);
    expect(observations).toMatchObject([
      {
        subject: {
          provider: "vocadb",
          externalId: "song:1023163",
          type: "track",
          title: "Anemone",
          url: "https://vocadb.net/S/1023163",
          durationSec: 222,
          publishedAtMs: 1_787_875_200_000,
          credits: [
            {
              provider: "vocadb",
              externalId: "artist:161",
              type: "person",
              title: "無力P",
              url: "https://vocadb.net/Ar/161",
            },
          ],
          tags: ["Original"],
        },
      },
    ]);
  });
});
