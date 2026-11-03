import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { cellOf } from "#/features/ingest/api/providers/export-cell";

import { LIBRARY_COLUMN, MIN_READ_MS, OWNED_ITEM, SESSION_COLUMN, STORE } from "./api";
import type { LibraryRow, SessionRow } from "./schemas";

const MS_PER_DAY = 86_400_000;

const epochOf = (text: string | undefined): Option.Option<number> =>
  pipe(
    cellOf(text),
    Option.map((value) => Date.parse(value)),
    Option.filter(Number.isFinite),
  );

type Book = Readonly<{ asin: string; title: string; series: Option.Option<string> }>;

const bookOf = ({ asin, title, series }: Book): SubjectInput => ({
  provider: "kindle",
  externalId: `asin:${asin}`,
  type: "book",
  title,
  url: `${STORE}/${encodeURIComponent(asin)}`,
  credits: [],
  tags: Option.toArray(series),
});

const isOwned = (row: LibraryRow): boolean =>
  Str.toLowerCase(Str.trim(row[LIBRARY_COLUMN.resourceType])) ===
    Str.toLowerCase(OWNED_ITEM.resourceType) &&
  Str.toLowerCase(Str.trim(row[LIBRARY_COLUMN.ownership])) ===
    Str.toLowerCase(OWNED_ITEM.ownership);

const ownedObservationOf = (row: LibraryRow): Option.Option<Observation> =>
  Option.all({
    asin: cellOf(row[LIBRARY_COLUMN.asin]),
    title: cellOf(row[LIBRARY_COLUMN.title]),
    occurredAtMs: epochOf(row[LIBRARY_COLUMN.acquiredAt]),
  }).pipe(
    Option.map(({ asin, title, occurredAtMs }) => ({
      kind: "collected" as const,
      subject: bookOf({ asin, title, series: cellOf(row[LIBRARY_COLUMN.series]) }),
      occurredAtMs,
    })),
  );

const libraryObservationsOf = (rows: readonly LibraryRow[]): readonly Observation[] =>
  pipe(
    rows,
    Arr.filter(isOwned),
    Arr.flatMap((row) => Option.toArray(ownedObservationOf(row))),
  );

const readLongEnough = (row: SessionRow): boolean =>
  pipe(
    cellOf(row[SESSION_COLUMN.readMs]),
    Option.map(Number),
    Option.filter(Number.isFinite),
    Option.match({ onNone: () => true, onSome: (readMs) => readMs >= MIN_READ_MS }),
  );

const sessionObservationOf = (row: SessionRow): Option.Option<Observation> =>
  Option.all({
    asin: cellOf(row[SESSION_COLUMN.asin]),
    title: cellOf(row[SESSION_COLUMN.title]),
    occurredAtMs: epochOf(row[SESSION_COLUMN.startedAt]),
  }).pipe(
    Option.filter(() => readLongEnough(row)),
    Option.map(({ asin, title, occurredAtMs }) => ({
      kind: "consumed" as const,
      subject: bookOf({ asin, title, series: Option.none() }),
      occurredAtMs,
    })),
  );

const dayKeyOf = ({ subject, occurredAtMs }: Observation): string =>
  `${subject.externalId}@${Math.floor(occurredAtMs / MS_PER_DAY)}`;

const sessionObservationsOf = (rows: readonly SessionRow[]): readonly Observation[] =>
  pipe(
    rows,
    Arr.flatMap((row) => Option.toArray(sessionObservationOf(row))),
    Arr.sortWith(({ occurredAtMs }) => occurredAtMs, Order.Number),
    Arr.dedupeWith((first, second) => dayKeyOf(first) === dayKeyOf(second)),
  );

export { libraryObservationsOf, sessionObservationsOf };
