import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

type TokenPage<Item> = Readonly<{
  items: readonly Item[];
  nextPageToken?: string | null | undefined;
}>;

const tokenPageOf =
  (url: string) =>
  <Item>({ items, nextPageToken }: TokenPage<Item>): Page<Item> => ({
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

const collectTokenPages = <Item>({
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
  collectPages({
    first,
    pages,
    fetchPage: (url) => fetchJson({ url, headers, schema }).pipe(Effect.map(tokenPageOf(url))),
  });

export type { TokenPage };
export { collectTokenPages };
