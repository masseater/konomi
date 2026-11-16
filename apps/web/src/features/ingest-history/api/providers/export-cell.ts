import { Array as Arr, Option, String as Str, pipe } from "effect";

const WRAPPING_QUOTES = /^"+|"+$/gu;
const MISSING_VALUES = ["not available", "not applicable", "null", "none"] as const;

const cellOf = (text: string | undefined): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(text),
    Option.map((raw) => pipe(raw, Str.replaceAll(WRAPPING_QUOTES, ""), Str.trim)),
    Option.filter(Str.isNonEmpty),
    Option.filter((value) =>
      pipe(
        MISSING_VALUES,
        Arr.every((missing) => missing !== Str.toLowerCase(value)),
      ),
    ),
  );

export { cellOf };
