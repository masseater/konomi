import { Option, pipe } from "effect";

const MS_PER_SECOND = 1000;

const durationOf = (seconds: Option.Option<number>): Readonly<{ durationSec?: number }> =>
  pipe(
    seconds,
    Option.map((durationSec) => ({ durationSec })),
    Option.getOrElse(() => ({})),
  );

const durationFromMs = (millis: Option.Option<number>): Readonly<{ durationSec?: number }> =>
  durationOf(
    pipe(
      millis,
      Option.map((ms) => Math.round(ms / MS_PER_SECOND)),
    ),
  );

const publishedOf = (date: Option.Option<string>): Readonly<{ publishedAtMs?: number }> =>
  pipe(
    date,
    Option.map((text) => Date.parse(text)),
    Option.filter(Number.isFinite),
    Option.map((publishedAtMs) => ({ publishedAtMs })),
    Option.getOrElse(() => ({})),
  );

export { durationFromMs, durationOf, publishedOf };
