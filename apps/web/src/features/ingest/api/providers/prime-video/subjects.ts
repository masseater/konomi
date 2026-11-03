import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { cellOf } from "#/features/ingest/api/providers/export-cell";
import { titleSubjectOf as sharedTitleSubjectOf } from "#/features/ingest/api/providers/title-subject";

import { MIN_WATCHED_SEC, NOT_VIEWING, STORE_SEARCH, VIEWING_COLUMN } from "./api";
import type { ViewingRow } from "./schemas";

const MS_PER_SECOND = 1000;
const SEASON = /^(?:season|staffel|saison|temporada|シーズン)\s*\d+|^第\s*\d+\s*(?:期|シーズン)/iu;
const SEPARATOR = /\s*[:：]\s*|\s+-\s+/u;
const UTC_SUFFIX = /\s*UTC$/iu;
const ZONED = /(?:Z|[+-]\d{2}:?\d{2})$/u;
const PLAYBACK_HOUR =
  /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})\s+(?<hour>\d{1,2}):(?<minute>\d{2}):(?<second>\d{2})$/u;
const FIRST_MONTH = 1;
const UNMETERED = 0;
const SERIES_NAME_PARTS = 1;

const valueOf = cellOf;

const zonedOf = (iso: string): string =>
  Match.value(ZONED.test(iso)).pipe(
    Match.when(true, () => iso),
    Match.orElse(() => `${iso}Z`),
  );

const isoEpochOf = (text: string): Option.Option<number> =>
  pipe(
    text,
    Str.replace(UTC_SUFFIX, ""),
    Str.replace(" ", "T"),
    zonedOf,
    (iso) => Option.some(Date.parse(iso)),
    Option.filter(Number.isFinite),
  );

const playbackHourEpochOf = (text: string): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(PLAYBACK_HOUR.exec(text)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.map(({ year, month, day, hour, minute, second }) =>
      Date.UTC(
        Number(year),
        Number(month) - FIRST_MONTH,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    ),
    Option.filter(Number.isFinite),
  );

const startedAtOf = (row: ViewingRow): Option.Option<number> =>
  pipe(
    valueOf(row[VIEWING_COLUMN.startedAt]),
    Option.flatMap(isoEpochOf),
    Option.orElse(() =>
      pipe(valueOf(row[VIEWING_COLUMN.playbackHour]), Option.flatMap(playbackHourEpochOf)),
    ),
  );

const isViewing = (row: ViewingRow): boolean =>
  pipe(
    valueOf(row[VIEWING_COLUMN.material]),
    Option.orElse(() => valueOf(row[VIEWING_COLUMN.videoType])),
    Option.match({
      onNone: () => true,
      onSome: (type) =>
        pipe(
          NOT_VIEWING,
          Arr.every((excluded) => excluded !== Str.toLowerCase(type)),
        ),
    }),
  );

const sessionSecondsOf = (row: ViewingRow, startedAtMs: number): Option.Option<number> =>
  pipe(
    valueOf(row[VIEWING_COLUMN.endedAt]),
    Option.flatMap(isoEpochOf),
    Option.map((endedAtMs) => (endedAtMs - startedAtMs) / MS_PER_SECOND),
  );

const watchedLongEnough = (row: ViewingRow, startedAtMs: number): boolean =>
  pipe(
    valueOf(row[VIEWING_COLUMN.secondsViewed]),
    Option.map(Number),
    Option.filter(Number.isFinite),
    Option.map((seconds) =>
      pipe(
        Option.some(seconds),
        Option.filter((viewed) => viewed > UNMETERED),
        Option.orElse(() => sessionSecondsOf(row, startedAtMs)),
      ),
    ),
    Option.match({
      onNone: () => true,
      onSome: Option.match({
        onNone: () => true,
        onSome: (seconds) => seconds >= MIN_WATCHED_SEC,
      }),
    }),
  );

const searchUrlOf = (query: string): string =>
  `${STORE_SEARCH}?k=${encodeURIComponent(query)}&i=instant-video`;

const titleSubjectOf = (title: string): SubjectInput => {
  const parts = Str.split(title, SEPARATOR);
  return sharedTitleSubjectOf({
    provider: "prime-video",
    title,
    series: pipe(
      Arr.head(parts),
      Option.filter(() =>
        pipe(
          Arr.drop(parts, SERIES_NAME_PARTS),
          Arr.some((part) => SEASON.test(part)),
        ),
      ),
    ),
    searchUrlOf,
  });
};

const viewingObservationOf = (row: ViewingRow): Option.Option<Observation> =>
  Option.all({
    title: valueOf(row[VIEWING_COLUMN.title]),
    occurredAtMs: startedAtOf(row),
  }).pipe(
    Option.filter(({ occurredAtMs }) => isViewing(row) && watchedLongEnough(row, occurredAtMs)),
    Option.map(({ title, occurredAtMs }) => ({
      kind: "consumed" as const,
      subject: titleSubjectOf(title),
      occurredAtMs,
    })),
  );

const viewingObservationsOf = (rows: readonly ViewingRow[]): readonly Observation[] =>
  pipe(
    rows,
    Arr.flatMap((row) => Option.toArray(viewingObservationOf(row))),
  );

export { viewingObservationsOf };
