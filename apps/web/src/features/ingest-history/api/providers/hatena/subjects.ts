import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest-history/api/providers/observe";
import { textSubjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { HatenaBookmark } from "./schemas.ts";

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

const pageOf = (bookmark: HatenaBookmark): SubjectInput =>
  textSubjectIn("hatena")({
    externalId: bookmark.link,
    type: "page",
    text: Option.fromNullishOr(bookmark.title),
    url: bookmark.link,
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

export const hatenaObservationsOf =
  (fetchedAt: number) =>
  (bookmarks: readonly HatenaBookmark[]): readonly Observation[] => {
    const observe = observationOf(epochOr(fetchedAt));
    return pipe(bookmarks, Arr.map(observe));
  };
