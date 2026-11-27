import { Option, pipe } from "effect";

import type { Page } from "#/features/ingest-history/api/providers/paging.server";

export type TokenPage<Item> = Readonly<{
  items: readonly Item[];
  nextPageToken?: string | null | undefined;
}>;

export const tokenPageOf = <Item>(
  { items, nextPageToken }: TokenPage<Item>,
  url: string,
): Page<Item> => ({
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
