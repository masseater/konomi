import { Effect, Option } from "effect";
import type { Schema } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { flatMapEach } from "#/features/ingest-history/api/providers/observe";
import type { Observer, Observing } from "#/features/ingest-history/api/providers/observe";
import {
  collectPages,
  nextUrlOf,
  pagesFor,
  startUrlOf,
} from "#/features/ingest-history/api/providers/paging.server";
import type { Next, Page } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

export type Reading = Readonly<{ headers: Headers; pages: number; fetchedAt: number }>;

export type Listing = (reading: Reading) => Observing;

export type Source<Item> = Readonly<{
  first: string;
  fetchPage: (cursor: string) => Effect.Effect<Page<Item>, ProviderError>;
}>;

export type Sourcing<Item> = (headers: Headers) => Source<Item>;

export type BodyFetch<Body> = (
  request: Readonly<{ url: string; headers: Headers; schema: Schema.Decoder<Body> }>,
) => Effect.Effect<Body, ProviderError>;

export const sourceOf = <Body, Item>({
  first,
  schema,
  fetch: load = fetchJson,
  items: itemsOf,
  next,
}: Readonly<{
  first: string;
  schema: Schema.Decoder<Body>;
  fetch?: BodyFetch<Body> | undefined;
  items: (body: Body) => readonly Item[];
  next?: Next<Body> | undefined;
}>): Sourcing<Item> => {
  const strategy = Option.fromUndefinedOr(next);
  return (headers) => ({
    first: startUrlOf({ first, next: strategy }),
    fetchPage: (cursor) =>
      load({ url: cursor, headers, schema }).pipe(
        Effect.map((body) => {
          const items = itemsOf(body);
          return { items, next: nextUrlOf({ next: strategy, body, count: items.length, cursor }) };
        }),
      ),
  });
};

export const collectedFrom =
  <Item>(source: Sourcing<Item>) =>
  (headers: Headers): Effect.Effect<readonly Item[], ProviderError> =>
    collectPages({ pages: pagesFor(false), ...source(headers) });

export const listingOf =
  <Item>({ label, source }: Readonly<{ label: string; source: Sourcing<Item> }>) =>
  (observe: Observer<Item>): Listing =>
  ({ headers, pages, fetchedAt }) =>
    collectPages({ pages, ...source(headers) }).pipe(
      Effect.map(observe(fetchedAt)),
      Effect.withSpan("ingest.listing", { attributes: { label } }),
    );

export const pulledListings =
  (listings: readonly Listing[]) =>
  (reading: Reading): Observing =>
    flatMapEach(listings, (listing) => listing(reading));
