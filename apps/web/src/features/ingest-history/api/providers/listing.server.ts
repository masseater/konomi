import { Effect } from "effect";
import type { Option, Schema } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { collectNumberedPages } from "#/features/ingest-history/api/providers/numbered-pages.server";
import type { Numbering } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { datedObservationsOf, flatMapEach } from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { collectJsonPages } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import type { SignalKind } from "#/shared/config";

export type Reading = Readonly<{ headers: Headers; pages: number; fetchedAt: number }>;

export type Listing = (reading: Reading) => Observing;

export const numberedListing =
  <Body, Item>({
    label,
    base,
    numbering,
    schema,
    itemsOf,
    observe,
  }: Readonly<{
    label: string;
    base: string;
    numbering: Numbering;
    schema: Schema.Decoder<Body>;
    itemsOf: (body: Body) => readonly Item[];
    observe: (fetchedAt: number) => (items: readonly Item[]) => readonly Observation[];
  }>): Listing =>
  ({ headers, pages, fetchedAt }) =>
    collectNumberedPages({ base, numbering, headers, pages, schema, itemsOf }).pipe(
      Effect.map(observe(fetchedAt)),
      Effect.withSpan("ingest.listing", { attributes: { label } }),
    );

export const pulledListings =
  (listings: readonly Listing[]) =>
  (reading: Reading): Observing =>
    flatMapEach(listings, (listing) => listing(reading));

const NO_DATE = (): string => "";

export const jsonListing =
  <Body extends Schema.Top & Readonly<{ DecodingServices: never }>, Item>({
    kind,
    first,
    schema,
    pageOf,
    subjectOf,
    occurredAtOf = NO_DATE,
  }: Readonly<{
    kind: SignalKind;
    first: string;
    schema: Body;
    pageOf: (body: Body["Type"], url: string) => Page<Item>;
    subjectOf: (item: Item) => Option.Option<SubjectInput>;
    occurredAtOf?: (item: Item) => string | null | undefined;
  }>): Listing =>
  ({ headers, pages, fetchedAt }) =>
    collectJsonPages({ first, headers, pages, schema, pageOf }).pipe(
      Effect.map(datedObservationsOf({ kind, fetchedAt, subjectOf, occurredAtOf })),
    );
