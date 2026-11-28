import { Option, String as Str, pipe } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { splitTitleSubjectOf } from "#/features/ingest-history/api/providers/title-subject";

import { WEB } from "./api.ts";

const SEPARATOR = ": ";
const EPISODE_PARTS = 3;

const searchUrlOf = (query: string): string => `${WEB}/search?q=${encodeURIComponent(query)}`;

export const netflixSubjectOf = (title: string): SubjectInput =>
  splitTitleSubjectOf({
    provider: "netflix",
    title,
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
