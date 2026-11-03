import { describe, expect, it } from "vite-plus/test";

import { hatenaObservationsOf } from "./subjects";

const FETCHED_AT = 0;
const BOOKMARKED_AT = 1_703_858_944_000;
const LINK = "https://blog.kushii.net/archives/2023/12/29/164827";

describe("hatenaObservationsOf", () => {
  it("collects the page with its tags and the comment", () => {
    expect(
      hatenaObservationsOf(FETCHED_AT)([
        {
          title: "株式会社はてな 京都本社が引っ越したらしいので行ってきた！",
          link: LINK,
          description: "ようこそ！",
          "dc:date": "2023-12-29T14:09:04Z",
          "dc:subject": ["京都", "はてな"],
        },
      ]),
    ).toStrictEqual([
      {
        kind: "collected",
        occurredAtMs: BOOKMARKED_AT,
        context: "ようこそ！",
        subject: {
          provider: "hatena",
          externalId: LINK,
          type: "page",
          title: "株式会社はてな 京都本社が引っ越したらしいので行ってきた！",
          url: LINK,
          credits: [],
          tags: ["京都", "はてな"],
        },
      },
    ]);
  });

  it("leaves out an empty comment", () => {
    const [observation] = hatenaObservationsOf(FETCHED_AT)([
      { link: LINK, description: "", "dc:subject": "はてな" },
    ]);
    expect(observation).not.toHaveProperty("context");
    expect(observation).toMatchObject({ subject: { tags: ["はてな"] } });
  });
});
