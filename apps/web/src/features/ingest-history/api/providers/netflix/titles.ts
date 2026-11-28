import { Option } from "effect";

import { nonBlank, textOr } from "#/features/ingest-history/api/providers/non-blank";
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

export const textOf = textOr("");

export const isBlank = (text: string | undefined): boolean => Option.isNone(nonBlank(text));
