import { describe, expect, it } from "vite-plus/test";

import { shelfObservationsOf } from "./subjects";

const FETCHED_AT = 0;
const YEAR = 2008;

describe("shelfObservationsOf", () => {
  it("records the book with its authors at the logged date", () => {
    expect(
      shelfObservationsOf({ kind: "consumed", context: "読んだ", fetchedAt: FETCHED_AT })([
        {
          work: {
            title: "Hold Me Tight",
            key: "/works/OL7909038W",
            author_keys: ["/authors/OL5487556A"],
            author_names: ["Sue Johnson"],
            first_publish_year: YEAR,
          },
          logged_date: "2025/09/23, 02:11:08",
        },
      ]),
    ).toStrictEqual([
      {
        kind: "consumed",
        context: "読んだ",
        occurredAtMs: 1_758_593_468_000,
        subject: {
          provider: "openlibrary",
          externalId: "/works/OL7909038W",
          type: "book",
          title: "Hold Me Tight",
          url: "https://openlibrary.org/works/OL7909038W",
          credits: [
            {
              provider: "openlibrary",
              externalId: "/authors/OL5487556A",
              type: "person",
              title: "Sue Johnson",
              url: "https://openlibrary.org/authors/OL5487556A",
            },
          ],
          tags: ["2008"],
        },
      },
    ]);
  });
});
