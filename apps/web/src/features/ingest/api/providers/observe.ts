import { Option, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { SignalKind } from "#/shared/config";

type Fetching = Readonly<{ headers: Readonly<Record<string, string>>; fetchedAt: number }>;

type Observed = readonly [SubjectInput, number];

const epochOr =
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

const withRelations =
  (relations: Pick<SubjectInput, "credits" | "tags">) =>
  (creator: CreatorInput): SubjectInput => ({ ...creator, ...relations });

const pageOf = <Item>({
  items,
  next,
}: Readonly<{ items: readonly Item[]; next?: string | null | undefined }>): Page<Item> => ({
  items,
  next: Option.fromNullishOr(next),
});

export type { Fetching, Observed };
export { epochOr, observeAt, observed, pageOf, withRelations };
