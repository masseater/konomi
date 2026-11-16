import { Array as Arr, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import type { LetterboxdEntry } from "./schemas";
import { letterboxdObservationsOf } from "./subjects";

const FETCHED_AT = 0;
const WATCHED_AT = 1_792_972_800_000;

const entryOf = (fields: Partial<LetterboxdEntry>): LetterboxdEntry => ({
  link: "https://letterboxd.com/someone/film/paper-tiger-2026/1/",
  pubDate: "Tue, 27 Oct 2026 16:27:23 +1300",
  "letterboxd:watchedDate": "2026-10-26",
  "letterboxd:filmTitle": "Paper Tiger",
  "letterboxd:filmYear": "2026",
  ...fields,
});

describe("letterboxdObservationsOf", () => {
  it("records a watch of the film page at the watched date", () => {
    expect(letterboxdObservationsOf(FETCHED_AT)([entryOf({})])).toMatchObject([
      {
        kind: "consumed",
        occurredAtMs: WATCHED_AT,
        subject: {
          provider: "letterboxd",
          externalId: "paper-tiger-2026",
          type: "movie",
          title: "Paper Tiger",
          url: "https://letterboxd.com/film/paper-tiger-2026/",
          tags: ["2026"],
        },
      },
    ]);
  });

  it("endorses a liked or highly rated film", () => {
    const liked = letterboxdObservationsOf(FETCHED_AT)([
      entryOf({ "letterboxd:memberLike": "Yes" }),
      entryOf({ "letterboxd:memberRating": "4.5" }),
      entryOf({ "letterboxd:memberRating": "3.5", "letterboxd:memberLike": "No" }),
    ]);
    expect(
      pipe(
        liked,
        Arr.map(({ kind }) => kind),
      ),
    ).toStrictEqual(["consumed", "endorsed", "consumed", "endorsed", "consumed"]);
  });

  it("skips entries that are not films", () => {
    expect(
      letterboxdObservationsOf(FETCHED_AT)([
        { link: "https://letterboxd.com/someone/list/best-of-2026/" },
      ]),
    ).toStrictEqual([]);
  });
});
