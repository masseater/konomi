import { describe, expect, it } from "vite-plus/test";

import { listenObservationsOf, lovedObservationsOf } from "./subjects";

const LISTENED_AT = 1_771_414_109;
const LOVED_AT = 1_741_972_335;
const DURATION_MS = 402_390;

describe("listenObservationsOf", () => {
  it("consumes the mapped recording and credits its artists", () => {
    expect(
      listenObservationsOf([
        {
          listened_at: LISTENED_AT,
          recording_msid: "fd0cad33",
          track_metadata: {
            track_name: "Some Resolve",
            artist_name: "Röyksopp",
            release_name: "Profound Mysteries II",
            additional_info: { duration_ms: DURATION_MS },
            mbid_mapping: {
              recording_mbid: "30d08f4c",
              artists: [{ artist_credit_name: "Röyksopp", artist_mbid: "1c70a3fc" }],
            },
          },
        },
      ]),
    ).toStrictEqual([
      {
        kind: "consumed",
        occurredAtMs: 1_771_414_109_000,
        subject: {
          provider: "listenbrainz",
          externalId: "recording:30d08f4c",
          type: "track",
          title: "Some Resolve",
          url: "https://musicbrainz.org/recording/30d08f4c",
          durationSec: 402,
          credits: [
            {
              provider: "listenbrainz",
              externalId: "artist:1c70a3fc",
              type: "person",
              title: "Röyksopp",
              url: "https://musicbrainz.org/artist/1c70a3fc",
            },
          ],
          tags: ["Profound Mysteries II"],
        },
      },
    ]);
  });
});

describe("listenObservationsOf without a MusicBrainz match", () => {
  it("falls back to the submitted names", () => {
    expect(
      listenObservationsOf([
        {
          listened_at: LISTENED_AT,
          recording_msid: "fd0cad33",
          track_metadata: { track_name: "Demo", artist_name: "Someone" },
        },
      ]),
    ).toMatchObject([
      {
        subject: {
          externalId: "msid:fd0cad33",
          url: "https://musicbrainz.org/search?query=Demo+Someone&type=recording",
          credits: [{ externalId: "artist-name:Someone", title: "Someone" }],
        },
      },
    ]);
  });
});

describe("lovedObservationsOf", () => {
  it("endorses loved recordings that carry metadata", () => {
    expect(
      lovedObservationsOf([
        {
          created: LOVED_AT,
          recording_mbid: "40313583",
          track_metadata: {
            track_name: "Heaven Knows",
            artist_name: "Kaskade",
            mbid_mapping: { recording_mbid: "40313583" },
          },
        },
        { created: LOVED_AT, recording_mbid: "deadbeef" },
      ]),
    ).toMatchObject([
      {
        kind: "endorsed",
        occurredAtMs: 1_741_972_335_000,
        subject: { externalId: "recording:40313583", title: "Heaven Knows" },
      },
    ]);
  });
});
