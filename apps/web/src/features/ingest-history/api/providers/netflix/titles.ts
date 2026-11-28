import { Option, String as Str, pipe } from "effect";

import { splitTitleSubjectOf } from "#/features/ingest-history/api/providers/title-subject";

import { WEB } from "./api.ts";

const SEPARATOR = ": ";
const EPISODE_PARTS = 3;

const searchUrlOf = (query: string): string => `${WEB}/search?q=${encodeURIComponent(query)}`;

export const netflixSubjectOf = splitTitleSubjectOf({
  provider: "netflix",
  separator: SEPARATOR,
  isSeries: (parts) => parts.length >= EPISODE_PARTS,
  searchUrlOf,
});

const NOTHING = "";

export const textOf = (text: string | undefined): string =>
  pipe(
    Option.fromUndefinedOr(text),
    Option.map(Str.trim),
    Option.getOrElse(() => NOTHING),
  );

export const isBlank = (text: string | undefined): boolean => Str.isEmpty(textOf(text));
