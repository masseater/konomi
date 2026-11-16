import { describe, expect, it } from "vite-plus/test";

import { stockObservationsOf } from "./subjects";

const FETCHED_AT = 0;

describe("stockObservationsOf", () => {
  it("collects the stocked article with its author and tags", () => {
    expect(
      stockObservationsOf(FETCHED_AT)([
        {
          id: "9ab5df60bf83afeb1d76",
          title: "コミットメッセージの書き方",
          url: "https://qiita.com/jnchito/items/9ab5df60bf83afeb1d76",
          created_at: "2025-11-25T11:47:54+09:00",
          tags: [{ name: "Git" }],
          user: { id: "jnchito", name: "" },
        },
      ]),
    ).toStrictEqual([
      {
        kind: "collected",
        occurredAtMs: FETCHED_AT,
        subject: {
          provider: "qiita",
          externalId: "9ab5df60bf83afeb1d76",
          type: "post",
          title: "コミットメッセージの書き方",
          url: "https://qiita.com/jnchito/items/9ab5df60bf83afeb1d76",
          publishedAtMs: 1_764_038_874_000,
          credits: [
            {
              provider: "qiita",
              externalId: "user:jnchito",
              type: "person",
              title: "jnchito",
              url: "https://qiita.com/jnchito",
            },
          ],
          tags: ["Git"],
        },
      },
    ]);
  });
});
