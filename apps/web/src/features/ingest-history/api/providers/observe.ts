import { Array as Arr, Effect, Function as Fn, Option, String as Str, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { withoutRelations } from "#/features/ingest-history/api/providers/creator-input";
import { parsedEpoch } from "#/features/ingest-history/api/providers/epoch";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";
import type { SignalKind } from "#/shared/config";

export type Fetched<Item> = Effect.Effect<Item, ProviderError>;

export type Observing = Fetched<readonly Observation[]>;

export type Fetching = Readonly<{ headers: Readonly<Record<string, string>>; fetchedAt: number }>;

type Observed = readonly [SubjectInput, number];

export const epochOr =
  (fallback: number) =>
  (text: string | null | undefined): number =>
    pipe(
      parsedEpoch(Option.fromNullishOr(text)),
      Option.getOrElse(() => fallback),
    );

const contextOf = (context: Option.Option<string>): Readonly<{ context?: string }> =>
  pipe(
    context,
    Option.map((name) => ({ context: name })),
    Option.getOrElse(() => ({})),
  );

const observed =
  ({ kind, context }: Readonly<{ kind: SignalKind; context: Option.Option<string> }>) =>
  ([subject, occurredAtMs]: Observed): Observation => ({
    kind,
    subject,
    occurredAtMs,
    ...contextOf(context),
  });

const observeAt =
  ({
    kind,
    context,
    at,
  }: Readonly<{
    kind: SignalKind;
    context: Option.Option<string>;
    at: (text: string | null | undefined) => number;
  }>) =>
  ({
    subject,
    occurredAt,
  }: Readonly<{
    subject: Option.Option<SubjectInput>;
    occurredAt: string | null | undefined;
  }>): Option.Option<Observation> =>
    pipe(
      subject,
      Option.map((found) => observed({ kind, context })([found, at(occurredAt)])),
    );

export const listEntriesOf =
  <Entry>({
    subjectOf,
    occurredAtOf,
    statusOf,
    labels,
    scoreOf,
    likedFrom,
    completedStatus,
  }: Readonly<{
    subjectOf: (entry: Entry) => SubjectInput;
    occurredAtOf: (entry: Entry) => Option.Option<number>;
    statusOf: (entry: Entry) => string | null | undefined;
    labels: Readonly<Record<string, string>>;
    scoreOf: (entry: Entry) => number | null | undefined;
    likedFrom: number;
    completedStatus: string;
  }>) =>
  (fetchedAt: number) =>
  (entry: Entry): readonly Observation[] => {
    const subject = subjectOf(entry);
    const occurredAtMs = Option.getOrElse(occurredAtOf(entry), () => fetchedAt);
    const status = statusOf(entry);
    const context = pipe(
      Option.fromNullishOr(status),
      Option.flatMap((name) => Option.fromUndefinedOr(labels[name])),
    );
    const liked = Option.exists(
      Option.fromNullishOr(scoreOf(entry)),
      (value) => value >= likedFrom,
    );
    return [
      observed({ kind: "collected", context })([subject, occurredAtMs]),
      ...pipe(
        [
          { kind: "endorsed", applies: liked },
          { kind: "consumed", applies: status === completedStatus },
        ] as const,
        Arr.filter(({ applies }) => applies),
        Arr.map(({ kind }) => observed({ kind, context: Option.none() })([subject, occurredAtMs])),
      ),
    ];
  };

export const datedObservationsOf =
  <Entry>({
    kind,
    listName,
    fetchedAt,
    subjectOf,
    occurredAtOf,
  }: Readonly<{
    kind: SignalKind;
    listName?: string;
    fetchedAt: number;
    subjectOf: (entry: Entry) => Option.Option<SubjectInput>;
    occurredAtOf: (entry: Entry) => string | null | undefined;
  }>) =>
  (entries: readonly Entry[]): readonly Observation[] => {
    const observe = observeAt({
      kind,
      context: Option.fromUndefinedOr(listName),
      at: epochOr(fetchedAt),
    });
    return pipe(
      entries,
      Arr.map((entry) => observe({ subject: subjectOf(entry), occurredAt: occurredAtOf(entry) })),
      Arr.getSomes,
    );
  };

export const nonEmptyOr =
  (fallback: string) =>
  (value: string | null | undefined): string =>
    pipe(
      Option.fromNullishOr(value),
      Option.filter(Str.isNonEmpty),
      Option.getOrElse(() => fallback),
    );

export const pageOf = <Item>({
  items,
  next,
}: Readonly<{ items: readonly Item[]; next?: string | null | undefined }>): Page<Item> => ({
  items,
  next: Option.fromNullishOr(next),
});

export const observationsOf =
  (kind: SignalKind) =>
  <Item>({
    subjectOf,
    occurredAtOf,
    context,
  }: Readonly<{
    subjectOf: (item: Item) => SubjectInput;
    occurredAtOf: (item: Item) => number;
    context?: string | undefined;
  }>) =>
  (items: readonly Item[]): readonly Observation[] => {
    const observe = observed({ kind, context: Option.fromUndefinedOr(context) });
    return pipe(
      items,
      Arr.map((item) => observe([subjectOf(item), occurredAtOf(item)])),
    );
  };

export const presentObservationsOf =
  (kind: SignalKind) =>
  <Item>(pick: (item: Item) => Option.Option<Omit<Observation, "kind">>) =>
  (items: readonly Item[]): readonly Observation[] =>
    pipe(
      items,
      Arr.map((item) => Option.map(pick(item), (found): Observation => ({ kind, ...found }))),
      Arr.getSomes,
    );

const KEEP_ALL = (): boolean => true;
const NO_CONTEXT = (): Option.Option<string> => Option.none();

export const stampedObservationsOf =
  (kind: SignalKind) =>
  <Item>({
    subjectOf,
    dateOf,
    keeps = KEEP_ALL,
    contextOf: contextFor = NO_CONTEXT,
  }: Readonly<{
    subjectOf: (item: Item) => SubjectInput;
    dateOf: (item: Item) => string | null | undefined;
    keeps?: (item: Item) => boolean;
    contextOf?: (item: Item) => Option.Option<string>;
  }>) =>
  (fetchedAt: number) =>
  (items: readonly Item[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      items,
      Arr.filter(keeps),
      Arr.map((item) =>
        observed({ kind, context: contextFor(item) })([subjectOf(item), at(dateOf(item))]),
      ),
    );
  };

export const fetchedObservationsOf =
  (kind: SignalKind) =>
  <Item>(subjectOf: (item: Item) => SubjectInput) =>
  (fetchedAt: number): ((items: readonly Item[]) => readonly Observation[]) =>
    observationsOf(kind)({ subjectOf, occurredAtOf: () => fetchedAt });

export const followedCreatorsAt = <Item>(
  creatorOf: (item: Item) => CreatorInput,
): ((fetchedAt: number) => (items: readonly Item[]) => readonly Observation[]) =>
  fetchedObservationsOf("followed")((item: Item) => withoutRelations(creatorOf(item)));

const TWO = 2;

export const flatMapEach: {
  <Item, Out>(
    pull: (item: Item) => Fetched<readonly Out[]>,
  ): (items: readonly Item[]) => Fetched<readonly Out[]>;
  <Item, Out>(
    items: readonly Item[],
    pull: (item: Item) => Fetched<readonly Out[]>,
  ): Fetched<readonly Out[]>;
} = Fn.dual(
  TWO,
  <Item, Out>(
    items: readonly Item[],
    pull: (item: Item) => Fetched<readonly Out[]>,
  ): Fetched<readonly Out[]> =>
    Effect.forEach(items, pull, { concurrency: 1 }).pipe(Effect.map(Arr.flatten)),
);

export const collectedListsOf =
  <List, Entry>({
    listsOf,
    nameOf,
    entriesOf,
    subjectOf,
    occurredAtOf,
  }: Readonly<{
    listsOf: (fetching: Fetching) => Fetched<readonly List[]>;
    nameOf: (list: List) => string;
    entriesOf: (fetching: Fetching, list: List) => Fetched<readonly Entry[]>;
    subjectOf: (entry: Entry) => Option.Option<SubjectInput>;
    occurredAtOf: (entry: Entry) => string | null | undefined;
  }>): ((fetching: Fetching) => Observing) =>
  (fetching) => {
    const pullList = (list: List): Observing => {
      const observe = datedObservationsOf({
        kind: "collected",
        listName: nameOf(list),
        fetchedAt: fetching.fetchedAt,
        subjectOf,
        occurredAtOf,
      });
      return entriesOf(fetching, list).pipe(Effect.map(observe));
    };
    return listsOf(fetching).pipe(Effect.flatMap(flatMapEach(pullList)));
  };
