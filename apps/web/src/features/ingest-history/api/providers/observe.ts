import { Array as Arr, Effect, Function as Fn, Option, String as Str, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
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
      Option.fromNullishOr(text),
      Option.map((value) => Date.parse(value)),
      Option.filter(Number.isFinite),
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

export const observeAt =
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

export const datedObservationsOf = <Entry>({
  kind,
  listName,
  fetchedAt,
  entries,
  subjectOf,
  occurredAtOf,
}: Readonly<{
  kind: SignalKind;
  listName?: string;
  fetchedAt: number;
  entries: readonly Entry[];
  subjectOf: (entry: Entry) => Option.Option<SubjectInput>;
  occurredAtOf: (entry: Entry) => string | null | undefined;
}>): readonly Observation[] => {
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

export const personInputOf = ({
  provider,
  externalId,
  title,
  url,
}: Readonly<{
  provider: CreatorInput["provider"];
  externalId: string;
  title: string;
  url: string;
}>): CreatorInput => ({ provider, externalId, type: "person", title, url });

export const nonEmptyOr =
  (fallback: string) =>
  (value: string | null | undefined): string =>
    pipe(
      Option.fromNullishOr(value),
      Option.filter(Str.isNonEmpty),
      Option.getOrElse(() => fallback),
    );

export const personMapper =
  ({
    provider,
    idPrefix,
    urlBase,
  }: Readonly<{ provider: CreatorInput["provider"]; idPrefix: string; urlBase: string }>) =>
  ({ id, name }: Readonly<{ id: string | number; name: string }>): CreatorInput =>
    personInputOf({
      provider,
      externalId: `${idPrefix}${id}`,
      title: name,
      url: `${urlBase}${id}`,
    });

export const withRelations =
  (relations: Pick<SubjectInput, "credits" | "tags">) =>
  (creator: CreatorInput): SubjectInput => ({ ...creator, ...relations });

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
