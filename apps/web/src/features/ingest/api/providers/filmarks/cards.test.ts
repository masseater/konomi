import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { clipCardsOf, markCardsOf } from "./cards";
import { clipObservationOf, markObservationsOf } from "./subjects";

const FETCHED_AT = 0;
const RATED = 4.3;

const markCard = ({ path, title, kind, score }: Readonly<Record<string, string>>): string =>
  `<div class="c-content-card"><div class="c-content-card__left"><h3 class="c-content-card__title"><a href="${path}#mark-1">${title}<span>(2026年製作の${kind})</span></a></h3><div class="c-rating"><div class="c-rating__star"></div><div class="c-rating__score">${score}</div></div></div></div>`;

const MARKS = `<div class="p-contents-list">${markCard({ path: "/movies/128602", title: "さとこはいつも", kind: "映画", score: "4.3" })}${markCard({ path: "/dramas/17443/23444", title: "ガス人間", kind: "ドラマ", score: "-" })}</div><a rel="next" href="/users/someone?page=2">2</a>`;

const CLIPS = `<div class="c-content-item"><h3 class="c-content-item__title"><a href="/movies/131345">サタデー・ナイト・シアター</a></h3></div>`;

describe("markCardsOf", () => {
  it("reads the work, the year, the score and the next page", () => {
    const { cards, next } = markCardsOf(MARKS);
    expect(cards).toStrictEqual([
      {
        path: "/movies/128602",
        title: "さとこはいつも",
        label: "さとこはいつも(2026年製作の映画)",
        score: Option.some(RATED),
      },
      {
        path: "/dramas/17443/23444",
        title: "ガス人間",
        label: "ガス人間(2026年製作のドラマ)",
        score: Option.none(),
      },
    ]);
    expect(next).toStrictEqual(Option.some("/users/someone?page=2"));
  });

  it("collects watched works and endorses the ones rated 4 or more", () => {
    const observations = pipe(
      markCardsOf(MARKS).cards,
      Arr.flatMap(markObservationsOf(FETCHED_AT)),
    );
    expect(observations).toMatchObject([
      {
        kind: "collected",
        context: "観た",
        subject: {
          provider: "filmarks",
          externalId: "movies/128602",
          type: "movie",
          title: "さとこはいつも",
          url: "https://filmarks.com/movies/128602",
          tags: ["2026"],
        },
      },
      { kind: "endorsed", subject: { externalId: "movies/128602" } },
      {
        kind: "collected",
        context: "観た",
        subject: { externalId: "dramas/17443/23444", type: "series" },
      },
    ]);
  });
});

describe("clipCardsOf", () => {
  it("collects clipped works as wanted", () => {
    const { cards, next } = clipCardsOf(CLIPS);
    const observations = pipe(cards, Arr.map(clipObservationOf(FETCHED_AT)));
    expect(observations).toMatchObject([
      {
        kind: "collected",
        context: "観たい",
        subject: { externalId: "movies/131345", title: "サタデー・ナイト・シアター" },
      },
    ]);
    expect(next).toStrictEqual(Option.none());
  });
});
