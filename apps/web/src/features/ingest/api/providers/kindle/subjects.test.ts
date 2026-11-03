import { Array as Arr, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import type { LibraryRow, SessionRow } from "./schemas";
import { libraryObservationsOf, sessionObservationsOf } from "./subjects";

const libraryRowOf = (fields: Partial<LibraryRow>): LibraryRow => ({
  ASIN: "B0EXAMPLE1",
  "Product Name": "三体",
  "Resource Type": "ITEM",
  "Ownership Type": "Item Owner",
  "Relationship Creation Date": "2026-10-01T09:00:00Z",
  "Series Title": "Not Available",
  ...fields,
});

const sessionRowOf = (fields: Partial<SessionRow>): SessionRow => ({
  ASIN: "B0EXAMPLE1",
  product_name: "三体",
  start_time: "2026-10-02T21:00:00Z",
  total_reading_milliseconds: "1200000",
  ...fields,
});

describe("libraryObservationsOf", () => {
  it("records an owned book as collected at the acquisition date", () => {
    expect(libraryObservationsOf([libraryRowOf({})])).toStrictEqual([
      {
        kind: "collected",
        occurredAtMs: Date.parse("2026-10-01T09:00:00Z"),
        subject: {
          provider: "kindle",
          externalId: "asin:B0EXAMPLE1",
          type: "book",
          title: "三体",
          url: "https://www.amazon.co.jp/dp/B0EXAMPLE1",
          credits: [],
          tags: [],
        },
      },
    ]);
  });

  it("tags the series and skips samples", () => {
    const observations = libraryObservationsOf([
      libraryRowOf({ "Series Title": "三体シリーズ" }),
      libraryRowOf({ ASIN: "B0SAMPLE", "Ownership Type": "Sample Owner" }),
    ]);
    expect(
      pipe(
        observations,
        Arr.map(({ subject }) => subject.tags),
      ),
    ).toStrictEqual([["三体シリーズ"]]);
  });
});

describe("sessionObservationsOf", () => {
  it("keeps the first session of a book per day and drops short ones", () => {
    const observations = sessionObservationsOf([
      sessionRowOf({ start_time: "2026-10-02T22:00:00Z" }),
      sessionRowOf({}),
      sessionRowOf({ start_time: "2026-10-03T08:00:00Z" }),
      sessionRowOf({ start_time: "2026-10-04T08:00:00Z", total_reading_milliseconds: "5000" }),
    ]);
    expect(
      pipe(
        observations,
        Arr.map(({ occurredAtMs }) => occurredAtMs),
      ),
    ).toStrictEqual([Date.parse("2026-10-02T21:00:00Z"), Date.parse("2026-10-03T08:00:00Z")]);
  });
});
