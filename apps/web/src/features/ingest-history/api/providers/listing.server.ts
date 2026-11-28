import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { flatMapEach } from "#/features/ingest-history/api/providers/observe";
import type { Observer, Observing } from "#/features/ingest-history/api/providers/observe";
import { collectPages, pagesFor } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";
import type { ProviderError } from "#/features/ingest-history/model/provider";

export type Reading = Readonly<{ headers: Headers; pages: number; fetchedAt: number }>;

export type Listing = (reading: Reading) => Observing;

export type Source<Item, Env = never> = Readonly<{
  first: string;
  fetchPage: (cursor: string) => Effect.Effect<Page<Item>, ProviderError, Env>;
}>;

export type Sourcing<Item, Env = never> = (headers: Headers) => Source<Item, Env>;

export const sourceOf =
  <Body, Item, Env = never>({
    first,
    fetchBody,
    pageOf,
  }: Readonly<{
    first: string;
    fetchBody: (cursor: string, headers: Headers) => Effect.Effect<Body, ProviderError, Env>;
    pageOf: (body: Body, cursor: string) => Page<Item>;
  }>): Sourcing<Item, Env> =>
  (headers) => ({
    first,
    fetchPage: (cursor) =>
      fetchBody(cursor, headers).pipe(Effect.map((body) => pageOf(body, cursor))),
  });

export const jsonSource = <Body, Item>({
  first,
  schema,
  pageOf,
}: Readonly<{
  first: string;
  schema: Schema.Decoder<Body>;
  pageOf: (body: Body, url: string) => Page<Item>;
}>): Sourcing<Item> =>
  sourceOf({
    first,
    fetchBody: (url, headers) => fetchJson({ url, headers, schema }),
    pageOf,
  });

export const cursorSource = <Body, Item>({
  first,
  param,
  schema,
  itemsOf,
  cursorOf,
}: Readonly<{
  first: string;
  param: string;
  schema: Schema.Decoder<Body>;
  itemsOf: (body: Body) => readonly Item[];
  cursorOf: (body: Body) => Option.Option<string>;
}>): Sourcing<Item> =>
  jsonSource({
    first,
    schema,
    pageOf: (body) => ({
      items: itemsOf(body),
      next: pipe(
        cursorOf(body),
        Option.map((cursor) => urlWith(first, { [param]: cursor })),
      ),
    }),
  });

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
