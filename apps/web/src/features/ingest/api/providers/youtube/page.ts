import { Option, pipe } from "effect";

import type { Page } from "#/features/ingest/api/providers/paging.server";

const tokenPageOf =
  (url: string) =>
  <Item>({
    items,
    nextPageToken,
  }: Readonly<{
    items: readonly Item[];
    nextPageToken?: string | null | undefined;
  }>): Page<Item> => ({
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

export { tokenPageOf };
