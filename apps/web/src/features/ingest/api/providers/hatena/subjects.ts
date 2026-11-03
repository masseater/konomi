import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";
import { postTitleOf } from "#/features/ingest/api/providers/post-title";

import type { HatenaBookmark } from "./schemas";

const tagsOf = (subject: HatenaBookmark["dc:subject"]): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(subject),
    Option.map((found): readonly string[] => Arr.ensure(found)),
    Option.getOrElse((): readonly string[] => []),
  );

const contextOf = (description: HatenaBookmark["description"]): Readonly<{ context?: string }> =>
  pipe(
    Option.fromUndefinedOr(description),
    Option.filter(Str.isNonEmpty),
    Option.map((context) => ({ context })),
    Option.getOrElse(() => ({})),
  );

const pageOf = (bookmark: HatenaBookmark): SubjectInput => ({
  provider: "hatena",
  externalId: bookmark.link,
  type: "page",
  title: postTitleOf({ text: Option.fromNullishOr(bookmark.title), fallback: bookmark.link }),
  url: bookmark.link,
  credits: [],
  tags: tagsOf(bookmark["dc:subject"]),
});

const observationOf =
  (at: (text: string | undefined) => number) =>
  (bookmark: HatenaBookmark): Observation => ({
    kind: "collected",
    subject: pageOf(bookmark),
    occurredAtMs: at(bookmark["dc:date"]),
    ...contextOf(bookmark.description),
  });

const hatenaObservationsOf =
  (fetchedAt: number) =>
  (bookmarks: readonly HatenaBookmark[]): readonly Observation[] => {
    const observe = observationOf(epochOr(fetchedAt));
    return pipe(bookmarks, Arr.map(observe));
  };

export { hatenaObservationsOf };
