import { count, inArray } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import { Array as Arr, DateTime, Effect, pipe } from "effect";

import { tasteOf } from "#/entities/signal/model/taste";
import type { SubjectInfo, Taste } from "#/entities/signal/model/taste";
import { db } from "#/shared/db/index.server";

import { filteredSignals, overFiltered, relationsOf } from "./query.server.ts";
import type { SignalFilter } from "./query.server.ts";

const bucketsOf = overFiltered((filtered) =>
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

const matchingSubjects = (filter: SignalFilter): SQLWrapper => {
  const filtered = filteredSignals(filter);
  return db.with(filtered).selectDistinct({ key: filtered.key }).from(filtered);
};

export const tasteProfile = (filter: SignalFilter): Effect.Effect<Taste> =>
  Effect.all(
    {
      now: DateTime.now,
      buckets: bucketsOf(filter),
      links: relationsOf((column) => inArray(column, matchingSubjects(filter))),
    },
    { concurrency: 1 },
  ).pipe(
    Effect.map(({ now, buckets, links: { credits, tags } }) =>
      tasteOf({
        nowMs: DateTime.toEpochMillis(now),
        buckets,
        subjects: pipe(
          credits,
          Arr.map(({ creator }): SubjectInfo => creator),
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
