import { Option, pipe } from "effect";
import type { Effect, Schema } from "effect";

import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { collectJsonPages } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

export type TokenPage<Item> = Readonly<{
  items: readonly Item[];
  nextPageToken?: string | null | undefined;
}>;

const tokenPageOf = <Item>({ items, nextPageToken }: TokenPage<Item>, url: string): Page<Item> => ({
  items,
  next: pipe(
    Option.fromNullishOr(nextPageToken),
    Option.map((token) => {
      const next = new URL(url);
      next.searchParams.set("pageToken", token);
      return next.toString();
    }),
  ),
});

export const collectTokenPages = <Item>({
  first,
  headers,
  pages,
  schema,
}: Readonly<{
  first: string;
  headers: Headers;
  pages: number;
  schema: Schema.Decoder<TokenPage<Item>>;
}>): Effect.Effect<readonly Item[], ProviderError> =>
  collectJsonPages({ first, headers, pages, schema, pageOf: tokenPageOf });
