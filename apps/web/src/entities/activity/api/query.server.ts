import { and, count, desc, gte, inArray, isNotNull, like, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Activity } from "#/entities/activity/model/activity";
import { activity } from "#/entities/activity/model/activity.table";
import type { ActivityKind, SourceId } from "#/shared/config";
import { db } from "#/shared/db/index.server";

type ActivityFilter = Readonly<{
  keyword: Option.Option<string>;
  sources: Option.Option<readonly SourceId[]>;
  kinds: Option.Option<readonly ActivityKind[]>;
  sinceMs: Option.Option<number>;
  untilMs: Option.Option<number>;
  limit: number;
}>;

type CreatorCount = Readonly<{
  source: SourceId;
  kind: ActivityKind;
  creator: string;
  items: number;
}>;

type KindCount = Readonly<{ source: SourceId; kind: ActivityKind; items: number }>;

const escapeLike = (keyword: string): string =>
  pipe(
    keyword,
    Str.replaceAll("\\", String.raw`\\`),
    Str.replaceAll("%", String.raw`\%`),
    Str.replaceAll("_", String.raw`\_`),
  );

const keywordCondition = (keyword: string): SQL | undefined => {
  const pattern = `%${escapeLike(keyword)}%`;
  return or(like(activity.title, pattern), like(activity.creator, pattern));
};

const conditionsOf = (filter: ActivityFilter): SQL | undefined => {
  const keyword = pipe(filter.keyword, Option.map(keywordCondition));
  const sources = pipe(
    filter.sources,
    Option.map((ids) => inArray(activity.source, [...ids])),
  );
  const kinds = pipe(
    filter.kinds,
    Option.map((ids) => inArray(activity.kind, [...ids])),
  );
  const since = pipe(
    filter.sinceMs,
    Option.map((ms) => gte(activity.occurredAtMs, ms)),
  );
  const until = pipe(
    filter.untilMs,
    Option.map((ms) => lte(activity.occurredAtMs, ms)),
  );
  return and(...Arr.getSomes([keyword, sources, kinds, since, until]));
};

const findActivities = (filter: ActivityFilter): Effect.Effect<readonly Activity[]> =>
  Effect.promise(() =>
    db
      .select()
      .from(activity)
      .where(conditionsOf(filter))
      .orderBy(desc(activity.occurredAtMs))
      .limit(filter.limit),
  ).pipe(Effect.withSpan("activity.find"));

const namedCreator = ({
  creator,
  ...rest
}: Readonly<{ source: SourceId; kind: ActivityKind; creator: string | null; items: number }>):
  | readonly CreatorCount[]
  | readonly [] =>
  pipe(
    Option.fromNullishOr(creator),
    Option.map((name): CreatorCount => ({ ...rest, creator: name })),
    Option.toArray,
  );

const countByCreator = (filter: ActivityFilter): Effect.Effect<readonly CreatorCount[]> =>
  Effect.promise(() =>
    db
      .select({
        source: activity.source,
        kind: activity.kind,
        creator: activity.creator,
        items: count(),
      })
      .from(activity)
      .where(and(conditionsOf(filter), isNotNull(activity.creator)))
      .groupBy(activity.source, activity.kind, activity.creator)
      .orderBy(desc(count()))
      .limit(filter.limit),
  ).pipe(Effect.map(Arr.flatMap(namedCreator)), Effect.withSpan("activity.count-by-creator"));

const countBySourceAndKind = (): Effect.Effect<readonly KindCount[]> =>
  Effect.promise(() =>
    db
      .select({ source: activity.source, kind: activity.kind, items: count() })
      .from(activity)
      .groupBy(activity.source, activity.kind),
  ).pipe(Effect.withSpan("activity.count-by-kind"));

export type { ActivityFilter, CreatorCount, KindCount };
export { countByCreator, countBySourceAndKind, findActivities };
