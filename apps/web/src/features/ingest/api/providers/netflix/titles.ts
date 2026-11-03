import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { titleSubjectOf as sharedTitleSubjectOf } from "#/features/ingest/api/providers/title-subject";

import { WEB } from "./api";

const SEPARATOR = ": ";
const EPISODE_PARTS = 3;

const searchUrlOf = (query: string): string => `${WEB}/search?q=${encodeURIComponent(query)}`;

const titleSubjectOf = (title: string): SubjectInput => {
  const parts = Str.split(title, SEPARATOR);
  return sharedTitleSubjectOf({
    provider: "netflix",
    title,
    series: pipe(
      Arr.head(parts),
      Option.filter(() => parts.length >= EPISODE_PARTS),
    ),
    searchUrlOf,
  });
};

const NOTHING = "";

const textOf = (text: string | undefined): string =>
  pipe(
    Option.fromUndefinedOr(text),
    Option.map(Str.trim),
    Option.getOrElse(() => NOTHING),
  );

const isBlank = (text: string | undefined): boolean => Str.isEmpty(textOf(text));

export { isBlank, textOf, titleSubjectOf };
