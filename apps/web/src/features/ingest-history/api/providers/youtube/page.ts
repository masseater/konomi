import { Option, pipe } from "effect";
import type { Schema } from "effect";

import { jsonSource } from "#/features/ingest-history/api/providers/listing.server";
import type { Sourcing } from "#/features/ingest-history/api/providers/listing.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";

export type TokenPage<Item> = Readonly<{
  items: readonly Item[];
  nextPageToken?: string | null | undefined;
}>;

const tokenPageOf =
  (url: string) =>
  <Item>({ items, nextPageToken }: TokenPage<Item>): Page<Item> => ({
    items,
    next: pipe(
      Option.fromNullishOr(nextPageToken),
      Option.map((token) => urlWith(url, { pageToken: token })),
    ),
  });

export const tokenSource = <Item>({
  first,
  schema,
}: Readonly<{
  first: string;
  schema: Schema.Decoder<TokenPage<Item>>;
}>): Sourcing<Item> =>
  jsonSource({
    first,
    schema,
    pageOf: (body, url) => tokenPageOf(url)(body),
  });
