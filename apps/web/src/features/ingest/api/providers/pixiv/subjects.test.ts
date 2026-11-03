import { describe, expect, it } from "vite-plus/test";

import type { Work } from "./subjects";
import { followObservationsOf, illustObservationsOf, novelObservationsOf } from "./subjects";

const FETCHED_AT = 1_792_972_800_000;
const CREATED_AT = "2026-10-01T12:00:00+09:00";

const ILLUST_ID = 1;
const NOVEL_ID = 2;

const workOf = (id: number): Work => ({
  id,
  title: "夕焼け",
  user: { id: 7, name: "絵描き" },
  tags: [{ name: "風景" }, { name: "オリジナル" }],
  createDate: CREATED_AT,
});

describe("pixiv observations", () => {
  it("collects a bookmarked illust with its artist and tags", () => {
    expect(illustObservationsOf(FETCHED_AT)([workOf(ILLUST_ID)])).toStrictEqual([
      {
        kind: "collected",
        occurredAtMs: FETCHED_AT,
        subject: {
          provider: "pixiv",
          externalId: "artwork:1",
          type: "artwork",
          title: "夕焼け",
          url: "https://www.pixiv.net/artworks/1",
          publishedAtMs: Date.parse(CREATED_AT),
          credits: [
            {
              provider: "pixiv",
              externalId: "user:7",
              type: "person",
              title: "絵描き",
              url: "https://www.pixiv.net/users/7",
            },
          ],
          tags: ["風景", "オリジナル"],
        },
      },
    ]);
  });

  it("collects a bookmarked novel as a book", () => {
    expect(novelObservationsOf(FETCHED_AT)([workOf(NOVEL_ID)])).toMatchObject([
      { subject: { type: "book", url: "https://www.pixiv.net/novel/show.php?id=2" } },
    ]);
  });

  it("follows a followed user as a person", () => {
    expect(followObservationsOf(FETCHED_AT)([{ id: 7, name: "絵描き" }])).toMatchObject([
      { kind: "followed", subject: { externalId: "user:7", type: "person" } },
    ]);
  });
});
