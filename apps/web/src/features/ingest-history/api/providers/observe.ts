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

export const listEntryObservationsOf = ({
  subject,
  occurredAtMs,
  context,
  score,
  likedFrom,
  completed,
}: Readonly<{
  subject: SubjectInput;
  occurredAtMs: number;
  context: Option.Option<string>;
  score: Option.Option<number>;
  likedFrom: number;
  completed: boolean;
}>): readonly Observation[] => [
  { kind: "collected", subject, occurredAtMs, ...contextOf(context) },
  ...pipe(
    [
      { kind: "endorsed", applies: Option.exists(score, (value) => value >= likedFrom) },
      { kind: "consumed", applies: completed },
    ] as const,
    Arr.filter(({ applies }) => applies),
    Arr.map(({ kind }): Observation => ({ kind, subject, occurredAtMs })),
  ),
];

export const libraryObservationsOf =
  <Game>(
    entryOf: (game: Game) => Option.Option<
      Readonly<{
        subject: SubjectInput;
        collectedAtMs: number;
        lastPlayedAtMs: Option.Option<number>;
      }>
    >,
  ) =>
  (games: readonly Game[]): readonly Observation[] =>
    pipe(
      games,
      Arr.flatMap((game) =>
        pipe(
          entryOf(game),
          Option.toArray,
          Arr.flatMap(({ subject, collectedAtMs, lastPlayedAtMs }): readonly Observation[] => [
            { kind: "collected", subject, occurredAtMs: collectedAtMs },
            ...pipe(
              lastPlayedAtMs,
              Option.map((occurredAtMs): Observation => ({
                kind: "consumed",
                subject,
                occurredAtMs,
              })),
              Option.toArray,
            ),
          ]),
        ),
      ),
    );

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
  }: Readonly<{
    subjectOf: (item: Item) => SubjectInput;
    occurredAtOf: (item: Item) => number;
  }>) =>
  (items: readonly Item[]): readonly Observation[] =>
    pipe(
      items,
      Arr.map((item): Observation => ({
        kind,
        subject: subjectOf(item),
        occurredAtMs: occurredAtOf(item),
      })),
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
      Arr.map((item): Observation => ({
        kind,
        subject: subjectOf(item),
        occurredAtMs: at(dateOf(item)),
        ...contextOf(contextFor(item)),
      })),
    );
  };

export const followedCreatorsAt =
  <Item>(creatorOf: (item: Item) => CreatorInput) =>
  (fetchedAt: number): ((items: readonly Item[]) => readonly Observation[]) =>
    observationsOf("followed")({
      subjectOf: (item: Item) => withoutRelations(creatorOf(item)),
      occurredAtOf: () => fetchedAt,
    });

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
