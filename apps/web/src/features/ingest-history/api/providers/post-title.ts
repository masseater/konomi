import { Option, String as Str, pipe } from "effect";

const TITLE_LENGTH = 120;
const TITLE_START = 0;
const TAG = /<[^>]*>/gu;
const SPACES = /\s+/gu;

const postTitleOf = ({
  text,
  fallback,
}: Readonly<{ text: Option.Option<string>; fallback: string }>): string =>
  pipe(
    text,
    Option.map(Str.trim),
    Option.map(Str.slice(TITLE_START, TITLE_LENGTH)),
    Option.filter(Str.isNonEmpty),
    Option.getOrElse(() => fallback),
  );

const plainTextOf = (html: string): string =>
  pipe(html, Str.replaceAll(TAG, " "), Str.replaceAll(SPACES, " "), Str.trim);

export { plainTextOf, postTitleOf };
