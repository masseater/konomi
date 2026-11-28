import { Function as Fn, Option, pipe } from "effect";

import { parsedEpoch } from "#/features/ingest-history/api/providers/epoch";

const UNITS_PER_SECOND = { seconds: 1, millis: 1000 } as const;

const BINARY = 2;

export type DurationUnit = keyof typeof UNITS_PER_SECOND;

export const durationOf: {
  (unit: DurationUnit): (duration: Option.Option<number>) => Readonly<{ durationSec?: number }>;
  (duration: Option.Option<number>, unit: DurationUnit): Readonly<{ durationSec?: number }>;
} = Fn.dual(
  BINARY,
  (duration: Option.Option<number>, unit: DurationUnit): Readonly<{ durationSec?: number }> =>
    pipe(
      duration,
      Option.map((units) => ({ durationSec: Math.round(units / UNITS_PER_SECOND[unit]) })),
      Option.getOrElse(() => ({})),
    ),
);

export const publishedOf = (date: Option.Option<string>): Readonly<{ publishedAtMs?: number }> =>
  pipe(
    parsedEpoch(date),
    Option.map((publishedAtMs) => ({ publishedAtMs })),
    Option.getOrElse(() => ({})),
  );
