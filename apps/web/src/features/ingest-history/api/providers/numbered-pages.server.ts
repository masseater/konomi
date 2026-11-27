import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { urlAdvancing, urlWith } from "#/features/ingest-history/api/providers/url-with";
import type { ProviderError } from "#/features/ingest-history/model/provider";

const NEXT = 1;

export type Numbering = Readonly<{ param: string; limit: number; start: number; step?: number }>;

const numberedPageOf =
  ({ url, param, limit, step }: Numbering & Readonly<{ url: string }>) =>
  <Item>(items: readonly Item[]): Page<Item> => ({
    items,
    next: pipe(
      Option.liftPredicate(items.length, (count: number) => count >= limit),
      Option.map(() =>
        urlAdvancing(url, {
          param,
          step: pipe(
            Option.fromUndefinedOr(step),
            Option.getOrElse(() => NEXT),
          ),
        }),
      ),
    ),
  });

export const collectNumbered = <Item>({
  base,
  numbering,
  pages,
  fetchItems,
}: Readonly<{
  base: string;
  numbering: Numbering;
  pages: number;
  fetchItems: (url: string) => Effect.Effect<readonly Item[], ProviderError>;
}>): Effect.Effect<readonly Item[], ProviderError> =>
  collectPages({
    first: urlWith(base, { [numbering.param]: String(numbering.start) }),
    pages,
    fetchPage: (url) => fetchItems(url).pipe(Effect.map(numberedPageOf({ url, ...numbering }))),
  });

export const collectNumberedPages = <Body, Item>({
  base,
  numbering,
  headers,
  pages,
  schema,
  itemsOf,
}: Readonly<{
  base: string;
  numbering: Numbering;
  headers: Headers;
  pages: number;
  schema: Schema.Decoder<Body>;
  itemsOf: (body: Body) => readonly Item[];
}>): Effect.Effect<readonly Item[], ProviderError> =>
  collectNumbered({
    base,
    numbering,
    pages,
    fetchItems: (url) => fetchJson({ url, headers, schema }).pipe(Effect.map(itemsOf)),
  });
