import { Option, String as Str, pipe } from "effect";

export const nonBlank = (text: string | null | undefined): Option.Option<string> =>
  pipe(Option.fromNullishOr(text), Option.map(Str.trim), Option.filter(Str.isNonEmpty));

export const textOr =
  (fallback: string) =>
  (text: string | null | undefined): string =>
    Option.getOrElse(nonBlank(text), () => fallback);
