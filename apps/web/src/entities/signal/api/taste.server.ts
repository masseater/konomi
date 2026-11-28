import { count, inArray } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import { Array as Arr, DateTime, Effect, pipe } from "effect";

import { tasteOf } from "#/entities/signal/model/taste";
import type { Link, SignalBucket, SubjectInfo, Taste } from "#/entities/signal/model/taste";
import { db } from "#/shared/db/index.server";

import { creditsOf, filteredSignals, tagsOf } from "./query.server.ts";
import type { KeyMatch, SignalFilter } from "./query.server.ts";

type BucketRow = SignalBucket & SubjectInfo;

const bucketsOf = (filter: SignalFilter): Effect.Effect<readonly BucketRow[]> => {
  const filtered = filteredSignals(filter);
  return Effect.promise(() =>
    db
      .with(filtered)
      .select({
        subjectKey: filtered.key,
        key: filtered.key,
        title: filtered.title,
        url: filtered.url,
        type: filtered.type,
        kind: filtered.kind,
        signals: count(filtered.id),
        atMs: filtered.occurredAtMs,
      })
      .from(filtered)
      .groupBy(filtered.key, filtered.kind, filtered.occurredAtMs),
  );
};

const matchingSubjects = (filter: SignalFilter): SQLWrapper => {
  const filtered = filteredSignals(filter);
  return db.with(filtered).selectDistinct({ key: filtered.key }).from(filtered);
};

type CreditRow = Link & Readonly<{ creator: SubjectInfo }>;

const rowsOf =
  <Raw, Row>(query: (match: KeyMatch) => Effect.Effect<readonly Raw[]>, toRow: (raw: Raw) => Row) =>
  (filter: SignalFilter): Effect.Effect<readonly Row[]> =>
    query((column) => inArray(column, matchingSubjects(filter))).pipe(Effect.map(Arr.map(toRow)));

const creditRowsOf = rowsOf(creditsOf, ({ subjectKey, key, title, url, type }): CreditRow => ({
  subjectKey,
  target: key,
  creator: { key, title, url, type },
}));

const tagRowsOf = rowsOf(tagsOf, ({ subjectKey, tag }): Link => ({ subjectKey, target: tag }));

export const tasteProfile = (filter: SignalFilter): Effect.Effect<Taste> =>
  Effect.all(
    {
      now: DateTime.now,
      buckets: bucketsOf(filter),
      credits: creditRowsOf(filter),
      tags: tagRowsOf(filter),
    },
    { concurrency: 1 },
  ).pipe(
    Effect.map(({ now, buckets, credits, tags }) =>
      tasteOf({
        nowMs: DateTime.toEpochMillis(now),
        buckets,
        subjects: pipe(
          credits,
          Arr.map(({ creator: found }): SubjectInfo => found),
          Arr.appendAll(buckets),
          Arr.dedupeWith((left, right) => left.key === right.key),
        ),
        credits,
        tags,
        limit: filter.limit,
      }),
    ),
    Effect.withSpan("signal.taste"),
  );
