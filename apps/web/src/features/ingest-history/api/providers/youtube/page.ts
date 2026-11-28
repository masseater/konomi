import { Option } from "effect";

import { cursorPageOf } from "#/features/ingest-history/api/providers/listing.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";

export const tokenPaging = <Item>(): ((
  body: Readonly<{ items: readonly Item[]; nextPageToken?: string | null | undefined }>,
  url: string,
) => Page<Item>) =>
  cursorPageOf({
    param: "pageToken",
    itemsOf: ({ items }) => items,
    cursorOf: ({ nextPageToken }) => Option.fromNullishOr(nextPageToken),
  });
