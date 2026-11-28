import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchFeed } from "#/features/ingest-history/api/providers/feed.server";
import { listingOf, sourceOf } from "#/features/ingest-history/api/providers/listing.server";
import type { Numbering } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { orEmpty } from "#/features/ingest-history/api/providers/subject-in";

import { FIELD, HEADERS, PAGE_SIZE, WEB } from "./api.ts";
import { BookmarkFeed } from "./schemas.ts";
import { hatenaObservationsOf } from "./subjects.ts";

const NUMBERING: Numbering = { param: "page", limit: PAGE_SIZE, start: 1 };

export const pullHatena = pullOf({
  provider: "hatena",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* hatena() {
      const user = yield* requireField(credential, FIELD.user);
      const bookmarks = listingOf({
        label: "bookmarks",
        source: sourceOf({
          first: `${WEB}/${encodeURIComponent(user)}/bookmark.rss`,
          next: { number: NUMBERING },
          schema: BookmarkFeed,
          fetch: fetchFeed,
          items: (feed) => orEmpty(feed["rdf:RDF"].item),
        }),
      })(hatenaObservationsOf);
      return yield* bookmarks({ headers: HEADERS, pages, fetchedAt });
    }),
});
