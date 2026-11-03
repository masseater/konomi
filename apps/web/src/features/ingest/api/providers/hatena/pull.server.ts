import { Clock, Effect } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchFeed, itemsOf } from "#/features/ingest/api/providers/feed.server";
import { collectNumbered } from "#/features/ingest/api/providers/numbered-pages.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { FIELD, HEADERS, PAGE_SIZE, WEB } from "./api";
import { BookmarkFeed } from "./schemas";
import { hatenaObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: PAGE_SIZE, start: 1 } as const;

const pullHatena = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* hatena() {
    const user = yield* requireField(credential, FIELD.user);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const bookmarks = yield* collectNumbered({
      base: `${WEB}/${encodeURIComponent(user)}/bookmark.rss`,
      numbering: NUMBERING,
      pages: pagesOf(cursor),
      fetchItems: (url) =>
        fetchFeed({ url, headers: HEADERS, schema: BookmarkFeed }).pipe(
          Effect.map((feed) => itemsOf(feed["rdf:RDF"].item)),
        ),
    });
    return {
      observations: hatenaObservationsOf(fetchedAt)(bookmarks),
      cursor: yield* BACKFILLED,
    };
  }).pipe(Effect.withSpan("hatena.pull"));

export { pullHatena };
