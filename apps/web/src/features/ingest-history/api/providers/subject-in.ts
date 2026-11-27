import { Match, Option, pipe } from "effect";

import type { SubjectInput } from "#/entities/signal";

export const subjectIn =
  (provider: SubjectInput["provider"]) =>
  ({
    credits = [],
    tags = [],
    ...subject
  }: Readonly<
    Omit<SubjectInput, "provider" | "credits" | "tags"> &
      Partial<Pick<SubjectInput, "credits" | "tags">>
  >): SubjectInput => ({ provider, ...subject, credits, tags });

export const textTagsOf = (value: number | string | null | undefined): readonly string[] =>
  pipe(Option.fromNullishOr(value), Option.map(String), Option.toArray);

export const orEmpty = <Item>(items: readonly Item[] | null | undefined): readonly Item[] =>
  pipe(
    Option.fromNullishOr(items),
    Option.getOrElse((): readonly Item[] => []),
  );

export const seriesOrBook = (anime: boolean): "series" | "book" =>
  Match.value(anime).pipe(
    Match.when(true, () => "series" as const),
    Match.orElse(() => "book" as const),
  );
