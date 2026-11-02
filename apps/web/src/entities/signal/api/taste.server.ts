import { count, eq, inArray } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { Array as Arr, DateTime, Effect, pipe } from "effect";

import { signal, subject, subjectTag, credit } from "#/entities/signal/model/signal.table";
import { tasteOf } from "#/entities/signal/model/taste";
import type { Link, SignalBucket, SubjectInfo, Taste } from "#/entities/signal/model/taste";
import { db } from "#/shared/db/index.server";

import { conditionsOf } from "./query.server";
import type { SignalFilter } from "./query.server";

const creator = alias(subject, "creator");

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

const creditsOf = (filter: SignalFilter): Effect.Effect<readonly CreditRow[]> =>
  Effect.promise(() =>
    db
      .select({
        subjectKey: credit.subjectKey,
        target: credit.creatorKey,
        creator: { key: creator.key, title: creator.title, url: creator.url, type: creator.type },
      })
      .from(credit)
      .innerJoin(creator, eq(creator.key, credit.creatorKey))
      .where(inArray(credit.subjectKey, matchingSubjects(filter))),
  );

const tagsOf = (filter: SignalFilter): Effect.Effect<readonly Link[]> =>
  Effect.promise(() =>
    db
      .select({ subjectKey: subjectTag.subjectKey, target: subjectTag.tag })
      .from(subjectTag)
      .where(inArray(subjectTag.subjectKey, matchingSubjects(filter))),
  );

const tasteProfile = (filter: SignalFilter): Effect.Effect<Taste> =>
  Effect.all({
    now: DateTime.now,
    buckets: bucketsOf(filter),
    credits: creditsOf(filter),
    tags: tagsOf(filter),
  }).pipe(
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

export { tasteProfile };
