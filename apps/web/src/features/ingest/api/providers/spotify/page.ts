import { Effect } from "effect";
import type { Schema } from "effect";

import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { pageOf } from "#/features/ingest/api/providers/observe";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

const collectOffsetPages = <Item>({
  first,
  headers,
  pages,
  schema,
}: Readonly<{
  first: string;
  headers: Headers;
  pages: number;
  schema: Schema.Decoder<Readonly<{ items: readonly Item[]; next?: string | null | undefined }>>;
}>): Effect.Effect<readonly Item[], ProviderError> =>
  collectPages({
    first,
    pages,
    fetchPage: (url) => fetchJson({ url, headers, schema }).pipe(Effect.map(pageOf)),
  });

export { collectOffsetPages };
