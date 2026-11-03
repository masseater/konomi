import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

const NEXT = 1;

type Numbering = Readonly<{ param: string; limit: number; start: number; step?: number }>;

const numberedPageOf =
  ({ url, param, limit, step }: Numbering & Readonly<{ url: string }>) =>
  <Item>(items: readonly Item[]): Page<Item> => ({
    items,
    next: pipe(
      Option.liftPredicate(items.length, (count: number) => count >= limit),
      Option.map(() => {
        const next = new URL(url);
        const current = Number(next.searchParams.get(param));
        const advance = pipe(
          Option.fromUndefinedOr(step),
          Option.getOrElse(() => NEXT),
        );
        next.searchParams.set(param, String(current + advance));
        return next.toString();
      }),
    ),
  });

const collectNumbered = <Item>({
  base,
  numbering,
  pages,
  fetchItems,
}: Readonly<{
  base: string;
  numbering: Numbering;
  pages: number;
  fetchItems: (url: string) => Effect.Effect<readonly Item[], ProviderError>;
}>): Effect.Effect<readonly Item[], ProviderError> => {
  const first = new URL(base);
  first.searchParams.set(numbering.param, String(numbering.start));
  return collectPages({
    first: first.toString(),
    pages,
    fetchPage: (url) => fetchItems(url).pipe(Effect.map(numberedPageOf({ url, ...numbering }))),
  });
};

const collectNumberedPages = <Body, Item>({
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

export type { Numbering };
export { collectNumbered, collectNumberedPages };
