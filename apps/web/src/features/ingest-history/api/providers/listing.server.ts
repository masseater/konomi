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

export type Source<Item> = Readonly<{
  first: string;
  fetchPage: (cursor: string) => Effect.Effect<Page<Item>, ProviderError>;
}>;

export type Sourcing<Item> = (headers: Headers) => Source<Item>;

export type BodyFetch<Body> = (
  request: Readonly<{ url: string; headers: Headers; schema: Schema.Decoder<Body> }>,
) => Effect.Effect<Body, ProviderError>;

export const sourceOf =
  <Body>({
    first,
    schema,
    fetch = fetchJson,
  }: Readonly<{
    first: string;
    schema: Schema.Decoder<Body>;
    fetch?: BodyFetch<Body> | undefined;
  }>) =>
  <Item>(pageOf: (body: Body, cursor: string) => Page<Item>): Sourcing<Item> =>
  (headers) => ({
    first,
    fetchPage: (cursor) =>
      fetch({ url: cursor, headers, schema }).pipe(Effect.map((body) => pageOf(body, cursor))),
  });

export const cursorPageOf =
  <Body, Item>({
    param,
    itemsOf,
    cursorOf,
  }: Readonly<{
    param: string;
    itemsOf: (body: Body) => readonly Item[];
    cursorOf: (body: Body) => Option.Option<string>;
  }>) =>
  (body: Body, url: string): Page<Item> => ({
    items: itemsOf(body),
    next: pipe(
      cursorOf(body),
      Option.map((cursor) => urlWith(url, { [param]: cursor })),
    ),
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

export const flatListing =
  <Item>({
    label,
    first,
    schema,
    fetch,
  }: Readonly<{
    label: string;
    first: string;
    schema: Schema.Decoder<readonly Item[]>;
    fetch?: BodyFetch<readonly Item[]> | undefined;
  }>) =>
  (observe: Observer<Item>): Listing =>
    listingOf({
      label,
      source: sourceOf({ first, schema, fetch })((items) => ({ items, next: Option.none() })),
    })(observe);
