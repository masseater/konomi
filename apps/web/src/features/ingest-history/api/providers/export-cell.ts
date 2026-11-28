import { Array as Arr, Option, String as Str, pipe } from "effect";

import { nonBlank } from "#/features/ingest-history/api/providers/non-blank";

const WRAPPING_QUOTES = /^"+|"+$/gu;
const MISSING_VALUES = ["not available", "not applicable", "null", "none"] as const;

export const cellOf = (text: string | undefined): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(text),
    Option.map(Str.replaceAll(WRAPPING_QUOTES, "")),
    Option.flatMap(nonBlank),
    Option.filter((value) =>
      pipe(
        MISSING_VALUES,
        Arr.every((missing) => missing !== Str.toLowerCase(value)),
      ),
    ),
  );
