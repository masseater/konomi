import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchFeed } from "#/features/ingest-history/api/providers/feed.server";
import { collectNumbered } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { orEmpty } from "#/features/ingest-history/api/providers/subject-in";

import { FIELD, HEADERS, PAGE_SIZE, WEB } from "./api";
import { BookmarkFeed } from "./schemas";
import { hatenaObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: PAGE_SIZE, start: 1 } as const;

export const pullHatena = pullOf({
  provider: "hatena",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* hatena() {
      const user = yield* requireField(credential, FIELD.user);
      const bookmarks = yield* collectNumbered({
        base: `${WEB}/${encodeURIComponent(user)}/bookmark.rss`,
        numbering: NUMBERING,
        pages,
        fetchItems: (url) =>
          fetchFeed({ url, headers: HEADERS, schema: BookmarkFeed }).pipe(
            Effect.map((feed) => orEmpty(feed["rdf:RDF"].item)),
          ),
      });
      return hatenaObservationsOf(fetchedAt)(bookmarks);
    }),
});
