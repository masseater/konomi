import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchFeed } from "#/features/ingest-history/api/providers/feed.server";
import { listingOf, sourceOf } from "#/features/ingest-history/api/providers/listing.server";
import { numberedPaging } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { orEmpty } from "#/features/ingest-history/api/providers/subject-in";

import { FIELD, HEADERS, PAGE_SIZE, WEB } from "./api.ts";
import { BookmarkFeed } from "./schemas.ts";
import { hatenaObservationsOf } from "./subjects.ts";

const NUMBERING = { param: "page", limit: PAGE_SIZE, start: 1 } as const;

export const pullHatena = pullOf({
  provider: "hatena",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* hatena() {
      const user = yield* requireField(credential, FIELD.user);
      const { first, pageOf } = numberedPaging({
        base: `${WEB}/${encodeURIComponent(user)}/bookmark.rss`,
        numbering: NUMBERING,
        itemsOf: (feed: typeof BookmarkFeed.Type) => orEmpty(feed["rdf:RDF"].item),
      });
      const bookmarks = listingOf({
        label: "bookmarks",
        source: sourceOf({
          first,
          fetchBody: (url, headers) => fetchFeed({ url, headers, schema: BookmarkFeed }),
          pageOf,
        }),
      })(hatenaObservationsOf);
      return yield* bookmarks({ headers: HEADERS, pages, fetchedAt });
    }),
});
