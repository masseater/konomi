import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

const FIRST_PAGE = 1;

type Numbering = Readonly<{ param: string; limit: number }>;

const numberedPageOf =
  ({ url, param, limit }: Numbering & Readonly<{ url: string }>) =>
  <Item>(items: readonly Item[]): Page<Item> => ({
    items,
    next: pipe(
      Option.liftPredicate(items.length, (count: number) => count >= limit),
      Option.map(() => {
        const next = new URL(url);
        const current = Number(next.searchParams.get(param));
        next.searchParams.set(param, String(current + FIRST_PAGE));
        return next.toString();
      }),
    ),
  });

const collectNumberedPages = <Item>({
  base,
  numbering,
  headers,
  pages,
  schema,
}: Readonly<{
  base: string;
  numbering: Numbering;
  headers: Headers;
  pages: number;
  schema: Schema.Decoder<readonly Item[]>;
}>): Effect.Effect<readonly Item[], ProviderError> => {
  const first = new URL(base);
  first.searchParams.set(numbering.param, String(FIRST_PAGE));
  return collectPages({
    first: first.toString(),
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers, schema }).pipe(Effect.map(numberedPageOf({ url, ...numbering }))),
  });
};

export type { Numbering };
export { collectNumberedPages };
