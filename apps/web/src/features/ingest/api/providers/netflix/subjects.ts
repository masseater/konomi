import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Observation } from "#/entities/signal";

import { ACTIVITY_COLUMN, AUTOPLAYED, HISTORY_COLUMN, MIN_WATCHED_SEC } from "./api";
import type { ActivityRow, HistoryRow } from "./schemas";
import { isBlank, textOf, titleSubjectOf } from "./titles";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const UNREADABLE = 0;
const CLOCK = /^(?<hours>\d+):(?<minutes>\d+):(?<seconds>\d+)$/u;

const secondsOf = (duration: string): number =>
  pipe(
    Str.trim(duration),
    (clock) => Option.fromNullishOr(CLOCK.exec(clock)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.map(
      ({ hours, minutes, seconds }) =>
        Number(hours) * SECONDS_PER_HOUR + Number(minutes) * SECONDS_PER_MINUTE + Number(seconds),
    ),
    Option.getOrElse(() => UNREADABLE),
  );

const utcEpochOf = (startedAt: string): number =>
  Date.parse(`${pipe(Str.trim(startedAt), Str.replace(" ", "T"))}Z`);

const watchedInFull =
  (profile: string) =>
  (row: ActivityRow): boolean =>
    isBlank(row[ACTIVITY_COLUMN.supplemental]) &&
    !Str.includes(AUTOPLAYED)(textOf(row[ACTIVITY_COLUMN.attributes])) &&
    secondsOf(row[ACTIVITY_COLUMN.duration]) >= MIN_WATCHED_SEC &&
    (Str.isEmpty(profile) || row[ACTIVITY_COLUMN.profile] === profile);

const activityObservationsOf = ({
  rows,
  profile,
}: Readonly<{ rows: readonly ActivityRow[]; profile: string }>): readonly Observation[] =>
  pipe(
    rows,
    Arr.filter(watchedInFull(profile)),
    Arr.map((row) => ({
      kind: "consumed" as const,
      subject: titleSubjectOf(row[ACTIVITY_COLUMN.title]),
      occurredAtMs: utcEpochOf(row[ACTIVITY_COLUMN.startedAt]),
    })),
    Arr.filter(({ occurredAtMs }) => Number.isFinite(occurredAtMs)),
  );

const historyObservationsOf = ({
  rows,
  epochs,
}: Readonly<{ rows: readonly HistoryRow[]; epochs: readonly number[] }>): readonly Observation[] =>
  pipe(
    rows,
    Arr.zip(epochs),
    Arr.map(([row, occurredAtMs]) => ({
      kind: "consumed" as const,
      subject: titleSubjectOf(row[HISTORY_COLUMN.title]),
      occurredAtMs,
    })),
  );

const historyDatesOf = (rows: readonly HistoryRow[]): readonly string[] =>
  pipe(
    rows,
    Arr.map((row) => row[HISTORY_COLUMN.date]),
  );

export { activityObservationsOf, historyDatesOf, historyObservationsOf };
