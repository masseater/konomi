import { Array as Arr, Match, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import type { SignalKind, SubjectType } from "#/shared/config";

const DAY_MS = 86_400_000;

const HORIZONS = {
  recent: { halfLifeDays: 30 },
  lasting: { halfLifeDays: 365 },
} as const;

const KIND_WEIGHTS = {
  consumed: 1,
  endorsed: 2,
  collected: 3,
  followed: 3,
} as const satisfies Readonly<Record<SignalKind, number>>;

const RISING_RATIO = 1.5;
const FADING_RATIO = 0.67;
const HALF = 0.5;
const CREATOR_TYPES: readonly SubjectType[] = ["person", "channel"];
const SHARE_DIGITS = 3;

type Horizon = keyof typeof HORIZONS;

type Trend = "rising" | "steady" | "fading";

type SignalBucket = Readonly<{
  subjectKey: string;
  kind: SignalKind;
  signals: number;
  atMs: number;
}>;

type SubjectInfo = Readonly<{ key: string; title: string; url: string; type: SubjectType }>;

type Link = Readonly<{ subjectKey: string; target: string }>;

type TasteInput = Readonly<{
  nowMs: number;
  buckets: readonly SignalBucket[];
  subjects: readonly SubjectInfo[];
  credits: readonly Link[];
  tags: readonly Link[];
  limit: number;
}>;

type Affinity = Readonly<{
  lasting: number;
  recent: number;
  trend: Trend;
  signals: number;
  lastAtMs: number;
}>;

type SubjectAffinity = Affinity & Omit<SubjectInfo, "key">;

type TagAffinity = Affinity & Readonly<{ tag: string }>;

type Facet<Item> = Readonly<{ top: readonly Item[]; rising: readonly Item[] }>;

type Taste = Readonly<{
  subjects: Facet<SubjectAffinity>;
  creators: Facet<SubjectAffinity>;
  tags: Facet<TagAffinity>;
}>;

type Score = Readonly<{
  recent: number;
  lasting: number;
  signals: number;
  lastAtMs: number;
}>;

const EMPTY_SCORE: Score = { recent: 0, lasting: 0, signals: 0, lastAtMs: 0 };

const decay = (horizon: Horizon, ageMs: number): number =>
  HALF ** (ageMs / (HORIZONS[horizon].halfLifeDays * DAY_MS));

const sumOf = <Value>(values: readonly Value[], pick: (value: Value) => number): number =>
  pipe(values, Arr.map(pick), Num.sumAll);

const latestOf = (values: readonly number[]): number => Math.max(EMPTY_SCORE.lastAtMs, ...values);

const sumScores = (scores: readonly Score[]): Score => ({
  recent: sumOf(scores, ({ recent }) => recent),
  lasting: sumOf(scores, ({ lasting }) => lasting),
  signals: sumOf(scores, ({ signals }) => signals),
  lastAtMs: latestOf(
    pipe(
      scores,
      Arr.map(({ lastAtMs }) => lastAtMs),
    ),
  ),
});

const decayedOf = (
  buckets: readonly SignalBucket[],
  nowMs: number,
  horizon: Horizon,
): Readonly<Record<SignalKind, number>> => {
  const decayed = (kind: SignalKind): number =>
    sumOf(
      pipe(
        buckets,
        Arr.filter((bucket) => bucket.kind === kind),
      ),
      ({ signals, atMs }) => signals * decay(horizon, nowMs - atMs),
    );
  return {
    consumed: decayed("consumed"),
    endorsed: decayed("endorsed"),
    collected: decayed("collected"),
    followed: decayed("followed"),
  };
};

const weigh = (decayed: Readonly<Record<SignalKind, number>>): number =>
  KIND_WEIGHTS.consumed * Math.log1p(decayed.consumed) +
  KIND_WEIGHTS.endorsed * decayed.endorsed +
  KIND_WEIGHTS.collected * decayed.collected +
  KIND_WEIGHTS.followed * decayed.followed;

const subjectScore = (buckets: readonly SignalBucket[], nowMs: number): Score => ({
  recent: weigh(decayedOf(buckets, nowMs, "recent")),
  lasting: weigh(decayedOf(buckets, nowMs, "lasting")),
  signals: sumOf(buckets, ({ signals }) => signals),
  lastAtMs: latestOf(
    pipe(
      buckets,
      Arr.map(({ atMs }) => atMs),
    ),
  ),
});

const rollUp = (
  scores: Readonly<Record<string, Score>>,
  links: readonly Link[],
): Readonly<Record<string, Score>> =>
  pipe(
    links,
    Arr.groupBy(({ target }) => target),
    Rec.map((group) =>
      pipe(
        group,
        Arr.map(({ subjectKey }) => scores[subjectKey] ?? EMPTY_SCORE),
        sumScores,
      ),
    ),
  );

const trendOf = (ratio: number): Trend =>
  Match.value(ratio).pipe(
    Match.when(Num.isGreaterThanOrEqualTo(RISING_RATIO), (): Trend => "rising"),
    Match.when(Num.isLessThanOrEqualTo(FADING_RATIO), (): Trend => "fading"),
    Match.orElse((): Trend => "steady"),
  );

const roundShare = (share: number): number => Num.round(share, SHARE_DIGITS);

const totalOf = (scores: readonly Score[], horizon: Horizon): number =>
  Math.max(
    Number.EPSILON,
    sumOf(scores, (score) => score[horizon]),
  );

const affinityOf = (score: Score, recentTotal: number, lastingTotal: number): Affinity => {
  const lasting = score.lasting / lastingTotal;
  const recent = score.recent / recentTotal;
  return {
    lasting: roundShare(lasting),
    recent: roundShare(recent),
    trend: trendOf(recent / Math.max(Number.EPSILON, lasting)),
    signals: score.signals,
    lastAtMs: score.lastAtMs,
  };
};

const facetOf = <Description extends object>(
  scores: Readonly<Record<string, Score>>,
  describe: (key: string) => Option.Option<Description>,
  limit: number,
): Facet<Description & Affinity> => {
  const values = Rec.values(scores);
  const recentTotal = totalOf(values, "recent");
  const lastingTotal = totalOf(values, "lasting");
  const items = pipe(
    Rec.toEntries(scores),
    Arr.map(([key, score]) =>
      Option.map(describe(key), (found): Description & Affinity => ({
        ...found,
        ...affinityOf(score, recentTotal, lastingTotal),
      })),
    ),
    Arr.getSomes,
  );
  const descending = Order.flip(Order.Number);
  return {
    top: pipe(
      items,
      Arr.sortWith(({ lasting }) => lasting, descending),
      Arr.take(limit),
    ),
    rising: pipe(
      items,
      Arr.filter(({ trend }) => trend === "rising"),
      Arr.sortWith(({ recent }) => recent, descending),
      Arr.take(limit),
    ),
  };
};

const tasteOf = (input: TasteInput): Taste => {
  const subjectScores = pipe(
    input.buckets,
    Arr.groupBy(({ subjectKey }) => subjectKey),
    Rec.map((buckets) => subjectScore(buckets, input.nowMs)),
  );
  const info = pipe(
    input.subjects,
    Arr.map((found): readonly [string, SubjectInfo] => [found.key, found]),
    Rec.fromEntries,
  );
  const describeSubject = (key: string): Option.Option<Omit<SubjectAffinity, keyof Affinity>> =>
    Option.map(Rec.get(info, key), ({ title, url, type }) => ({ title, url, type }));
  const isCreator = (key: string): boolean =>
    Option.exists(Rec.get(info, key), ({ type }) => Arr.contains(CREATOR_TYPES, type));
  const creatorScores = Rec.union(
    rollUp(subjectScores, input.credits),
    pipe(
      subjectScores,
      Rec.filter((_score, key) => isCreator(key)),
    ),
    (left, right) => sumScores([left, right]),
  );
  return {
    subjects: facetOf(
      pipe(
        subjectScores,
        Rec.filter((_score, key) => !Rec.has(creatorScores, key)),
      ),
      describeSubject,
      input.limit,
    ),
    creators: facetOf(creatorScores, describeSubject, input.limit),
    tags: facetOf(rollUp(subjectScores, input.tags), (tag) => Option.some({ tag }), input.limit),
  };
};

export type {
  Affinity,
  Link,
  SignalBucket,
  SubjectAffinity,
  SubjectInfo,
  TagAffinity,
  Taste,
  TasteInput,
  Trend,
};
export { DAY_MS, HORIZONS, KIND_WEIGHTS, tasteOf };
