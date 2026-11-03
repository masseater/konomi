import { describe, expect, it } from "vite-plus/test";

import { favoriteObservationsOf, friendObservationsOf } from "./subjects";

const FETCHED_AT = 1_792_972_800_000;

describe("favoriteObservationsOf", () => {
  it("collects a favorite world with its author and author tags", () => {
    const world = {
      id: "wrld_1",
      name: "Midnight Rooftop",
      authorId: "usr_9",
      authorName: "builder",
      tags: ["author_tag_chill", "system_approved"],
    };
    expect(favoriteObservationsOf({ kind: "world", fetchedAt: FETCHED_AT })([world])).toStrictEqual(
      [
        {
          kind: "collected",
          occurredAtMs: FETCHED_AT,
          subject: {
            provider: "vrchat",
            externalId: "world:wrld_1",
            type: "world",
            title: "Midnight Rooftop",
            url: "https://vrchat.com/home/world/wrld_1",
            credits: [
              {
                provider: "vrchat",
                externalId: "user:usr_9",
                type: "person",
                title: "builder",
                url: "https://vrchat.com/home/user/usr_9",
              },
            ],
            tags: ["chill"],
          },
        },
      ],
    );
  });

  it("records an avatar as an item", () => {
    const avatar = { id: "avtr_1", name: "Fox", authorName: "maker" };
    expect(
      favoriteObservationsOf({ kind: "avatar", fetchedAt: FETCHED_AT })([avatar]),
    ).toMatchObject([
      { subject: { type: "item", url: "https://vrchat.com/home/avatar/avtr_1", credits: [] } },
    ]);
  });
});

describe("friendObservationsOf", () => {
  it("follows each friend as a person", () => {
    expect(friendObservationsOf(FETCHED_AT)([{ id: "usr_2", displayName: "pal" }])).toMatchObject([
      { kind: "followed", subject: { externalId: "user:usr_2", type: "person", title: "pal" } },
    ]);
  });
});
