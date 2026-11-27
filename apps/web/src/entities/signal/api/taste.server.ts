import { count, eq, inArray } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import { Array as Arr, DateTime, Effect, pipe } from "effect";

import { signal, subject } from "#/entities/signal/model/signal.table";
import { tasteOf } from "#/entities/signal/model/taste";
import type { Link, SignalBucket, SubjectInfo, Taste } from "#/entities/signal/model/taste";
import { db } from "#/shared/db/index.server";

import { conditionsOf, creditsOf, tagsOf } from "./query.server";
import type { SignalFilter } from "./query.server";

type BucketRow = SignalBucket & SubjectInfo;

const bucketsOf = (filter: SignalFilter): Effect.Effect<readonly BucketRow[]> =>
  Effect.promise(() =>
    db
      .select({
        subjectKey: subject.key,
        key: subject.key,
        title: subject.title,
        url: subject.url,
        type: subject.type,
        kind: signal.kind,
        signals: count(signal.id),
        atMs: signal.occurredAtMs,
      })
      .from(signal)
      .innerJoin(subject, eq(subject.key, signal.subjectKey))
      .where(conditionsOf(filter))
      .groupBy(subject.key, signal.kind, signal.occurredAtMs),
  );

const matchingSubjects = (filter: SignalFilter): SQLWrapper =>
  db
    .selectDistinct({ key: signal.subjectKey })
    .from(signal)
    .innerJoin(subject, eq(subject.key, signal.subjectKey))
    .where(conditionsOf(filter));

type CreditRow = Link & Readonly<{ creator: SubjectInfo }>;

const creditRowsOf = (filter: SignalFilter): Effect.Effect<readonly CreditRow[]> =>
  creditsOf((column) => inArray(column, matchingSubjects(filter))).pipe(
    Effect.map(
      Arr.map(({ subjectKey, key, title, url, type }): CreditRow => ({
        subjectKey,
        target: key,
        creator: { key, title, url, type },
      })),
    ),
  );

const tagRowsOf = (filter: SignalFilter): Effect.Effect<readonly Link[]> =>
  tagsOf((column) => inArray(column, matchingSubjects(filter))).pipe(
    Effect.map(Arr.map(({ subjectKey, tag }): Link => ({ subjectKey, target: tag }))),
  );

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
