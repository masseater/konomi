import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { parsedEpoch } from "#/features/ingest-history/api/providers/epoch";
import { cellOf } from "#/features/ingest-history/api/providers/export-cell";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import { LIBRARY_COLUMN, MIN_READ_MS, OWNED_ITEM, SESSION_COLUMN, STORE } from "./api.ts";
import type { LibraryRow, SessionRow } from "./schemas.ts";

const MS_PER_DAY = 86_400_000;

const epochOf = (text: string | undefined): Option.Option<number> => parsedEpoch(cellOf(text));

type Book = Readonly<{ asin: string; title: string; series: Option.Option<string> }>;

const bookOf = ({ asin, title, series }: Book): SubjectInput =>
  subjectIn("kindle")({
    externalId: `asin:${asin}`,
    type: "book",
    title,
    url: `${STORE}/${encodeURIComponent(asin)}`,
    tags: Option.toArray(series),
  });

const isOwned = (row: LibraryRow): boolean =>
  Str.toLowerCase(Str.trim(row[LIBRARY_COLUMN.resourceType])) ===
    Str.toLowerCase(OWNED_ITEM.resourceType) &&
  Str.toLowerCase(Str.trim(row[LIBRARY_COLUMN.ownership])) ===
    Str.toLowerCase(OWNED_ITEM.ownership);

const ownedObservationsOf = observationsOf("collected")((row: LibraryRow) =>
  Option.all({
    asin: cellOf(row[LIBRARY_COLUMN.asin]),
    title: cellOf(row[LIBRARY_COLUMN.title]),
    occurredAtMs: epochOf(row[LIBRARY_COLUMN.acquiredAt]),
  }).pipe(
    Option.map(({ asin, title, occurredAtMs }) => ({
      subject: bookOf({ asin, title, series: cellOf(row[LIBRARY_COLUMN.series]) }),
      occurredAtMs,
    })),
  ),
);

export const libraryObservationsOf = (rows: readonly LibraryRow[]): readonly Observation[] =>
  pipe(rows, Arr.filter(isOwned), ownedObservationsOf);

const readLongEnough = (row: SessionRow): boolean =>
  pipe(
    cellOf(row[SESSION_COLUMN.readMs]),
    Option.map(Number),
    Option.filter(Number.isFinite),
    Option.match({ onNone: () => true, onSome: (readMs) => readMs >= MIN_READ_MS }),
  );

const sessionObservationsFrom = observationsOf("consumed")((row: SessionRow) =>
  Option.all({
    asin: cellOf(row[SESSION_COLUMN.asin]),
    title: cellOf(row[SESSION_COLUMN.title]),
    occurredAtMs: epochOf(row[SESSION_COLUMN.startedAt]),
  }).pipe(
    Option.filter(() => readLongEnough(row)),
    Option.map(({ asin, title, occurredAtMs }) => ({
      subject: bookOf({ asin, title, series: Option.none() }),
      occurredAtMs,
    })),
  ),
);

const dayKeyOf = ({ subject, occurredAtMs }: Observation): string =>
  `${subject.externalId}@${Math.floor(occurredAtMs / MS_PER_DAY)}`;

export const sessionObservationsOf = (rows: readonly SessionRow[]): readonly Observation[] =>
  pipe(
    sessionObservationsFrom(rows),
    Arr.sortWith(({ occurredAtMs }) => occurredAtMs, Order.Number),
    Arr.dedupeWith((first, second) => dayKeyOf(first) === dayKeyOf(second)),
  );
