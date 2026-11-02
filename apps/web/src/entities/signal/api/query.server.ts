import { and, count, desc, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { credit, signal, subject, subjectTag } from "#/entities/signal/model/signal.table";
import type { ProviderId, SignalKind, SubjectType } from "#/shared/config";
import { db } from "#/shared/db/index.server";

const creator = alias(subject, "creator");

type SignalFilter = Readonly<{
  keyword: Option.Option<string>;
  kinds: Option.Option<readonly SignalKind[]>;
  types: Option.Option<readonly SubjectType[]>;
  providers: Option.Option<readonly ProviderId[]>;
  sinceMs: Option.Option<number>;
  untilMs: Option.Option<number>;
  limit: number;
}>;

type FoundSignal = Readonly<{
  kind: SignalKind;
  context: string;
  occurredAtMs: number;
  provider: ProviderId;
  type: SubjectType;
  title: string;
  url: string;
  credits: readonly Readonly<{ title: string; url: string; type: SubjectType }>[];
  tags: readonly string[];
}>;

type CreatorCount = Readonly<{ title: string; url: string; type: SubjectType; signals: number }>;

type TagCount = Readonly<{ tag: string; signals: number }>;

type KindCount = Readonly<{
  provider: ProviderId;
  type: SubjectType;
  kind: SignalKind;
  signals: number;
}>;

const escapeLike = (keyword: string): string =>
  pipe(
    keyword,
    Str.replaceAll("\\", String.raw`\\`),
    Str.replaceAll("%", String.raw`\%`),
    Str.replaceAll("_", String.raw`\_`),
  );

const keywordCondition = (keyword: string): SQL | undefined => {
  const pattern = `%${escapeLike(keyword)}%`;
  const creditedMatch = db
    .select({ key: credit.subjectKey })
    .from(credit)
    .innerJoin(creator, eq(creator.key, credit.creatorKey))
    .where(like(creator.title, pattern));
  const taggedMatch = db
    .select({ key: subjectTag.subjectKey })
    .from(subjectTag)
    .where(like(subjectTag.tag, pattern));
  return or(
    like(subject.title, pattern),
    inArray(subject.key, creditedMatch),
    inArray(subject.key, taggedMatch),
  );
};

const conditionsOf = (filter: SignalFilter): SQL | undefined => {
  const keyword = pipe(filter.keyword, Option.map(keywordCondition));
  const kinds = pipe(
    filter.kinds,
    Option.map((ids) => inArray(signal.kind, [...ids])),
  );
  const types = pipe(
    filter.types,
    Option.map((ids) => inArray(subject.type, [...ids])),
  );
  const providers = pipe(
    filter.providers,
    Option.map((ids) => inArray(subject.provider, [...ids])),
  );
  const since = pipe(
    filter.sinceMs,
    Option.map((ms) => gte(signal.occurredAtMs, ms)),
  );
  const until = pipe(
    filter.untilMs,
    Option.map((ms) => lte(signal.occurredAtMs, ms)),
  );
  return and(...Arr.getSomes([keyword, kinds, types, providers, since, until]));
};

const creditsOf = (
  keys: readonly string[],
): Effect.Effect<
  readonly Readonly<{ subjectKey: string; title: string; url: string; type: SubjectType }>[]
> =>
  Effect.promise(() =>
    db
      .select({
        subjectKey: credit.subjectKey,
        title: creator.title,
        url: creator.url,
        type: creator.type,
      })
      .from(credit)
      .innerJoin(creator, eq(creator.key, credit.creatorKey))
      .where(inArray(credit.subjectKey, [...keys])),
  );

const tagsOf = (
  keys: readonly string[],
): Effect.Effect<readonly Readonly<{ subjectKey: string; tag: string }>[]> =>
  Effect.promise(() =>
    db
      .select({ subjectKey: subjectTag.subjectKey, tag: subjectTag.tag })
      .from(subjectTag)
      .where(inArray(subjectTag.subjectKey, [...keys])),
  );

type SignalRow = Omit<FoundSignal, "credits" | "tags"> & Readonly<{ key: string }>;

const signalRows = (filter: SignalFilter): Effect.Effect<readonly SignalRow[]> =>
  Effect.promise(() =>
    db
      .select({
        key: subject.key,
        kind: signal.kind,
        context: signal.context,
        occurredAtMs: signal.occurredAtMs,
        provider: subject.provider,
        type: subject.type,
        title: subject.title,
        url: subject.url,
      })
      .from(signal)
      .innerJoin(subject, eq(subject.key, signal.subjectKey))
      .where(conditionsOf(filter))
      .orderBy(desc(signal.occurredAtMs))
      .limit(filter.limit),
  );

const findSignals = (filter: SignalFilter): Effect.Effect<readonly FoundSignal[]> =>
  signalRows(filter).pipe(
    Effect.flatMap((rows) => {
      const keys = pipe(
        rows,
        Arr.map(({ key }) => key),
        Arr.dedupe,
      );
      return Effect.all({
        rows: Effect.succeed(rows),
        credits: creditsOf(keys),
        tags: tagsOf(keys),
      });
    }),
    Effect.map(({ rows, credits, tags }) =>
      pipe(
        rows,
        Arr.map((row): FoundSignal => ({
          kind: row.kind,
          context: row.context,
          occurredAtMs: row.occurredAtMs,
          provider: row.provider,
          type: row.type,
          title: row.title,
          url: row.url,
          credits: pipe(
            credits,
            Arr.filter(({ subjectKey }) => subjectKey === row.key),
            Arr.map(({ title, url, type }) => ({ title, url, type })),
          ),
          tags: pipe(
            tags,
            Arr.filter(({ subjectKey }) => subjectKey === row.key),
            Arr.map(({ tag }) => tag),
          ),
        })),
      ),
    ),
    Effect.withSpan("signal.find"),
  );

const topCreators = (filter: SignalFilter): Effect.Effect<readonly CreatorCount[]> =>
  Effect.promise(() =>
    db
      .select({
        title: creator.title,
        url: creator.url,
        type: creator.type,
        signals: count(signal.id),
      })
      .from(signal)
      .innerJoin(subject, eq(subject.key, signal.subjectKey))
      .innerJoin(credit, eq(credit.subjectKey, signal.subjectKey))
      .innerJoin(creator, eq(creator.key, credit.creatorKey))
      .where(conditionsOf(filter))
      .groupBy(creator.key)
      .orderBy(desc(count(signal.id)))
      .limit(filter.limit),
  ).pipe(Effect.withSpan("signal.top-creators"));

const topTags = (filter: SignalFilter): Effect.Effect<readonly TagCount[]> =>
  Effect.promise(() =>
    db
      .select({ tag: subjectTag.tag, signals: count(signal.id) })
      .from(signal)
      .innerJoin(subject, eq(subject.key, signal.subjectKey))
      .innerJoin(subjectTag, eq(subjectTag.subjectKey, signal.subjectKey))
      .where(conditionsOf(filter))
      .groupBy(subjectTag.tag)
      .orderBy(desc(count(signal.id)))
      .limit(filter.limit),
  ).pipe(Effect.withSpan("signal.top-tags"));

const countByKind = (filter: SignalFilter): Effect.Effect<readonly KindCount[]> =>
  Effect.promise(() =>
    db
      .select({
        provider: subject.provider,
        type: subject.type,
        kind: signal.kind,
        signals: count(signal.id),
      })
      .from(signal)
      .innerJoin(subject, eq(subject.key, signal.subjectKey))
      .where(conditionsOf(filter))
      .groupBy(subject.provider, subject.type, signal.kind),
  ).pipe(Effect.withSpan("signal.count-by-kind"));

export type { CreatorCount, FoundSignal, KindCount, SignalFilter, TagCount };
export { countByKind, findSignals, topCreators, topTags };
