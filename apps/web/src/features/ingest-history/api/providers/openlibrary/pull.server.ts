import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { collectNumberedPages } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { flatMapEach } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { FIELD, HEADERS, SHELVES, WEB } from "./api";
import { ReadingLog } from "./schemas";
import type { OpenLibraryEntry } from "./schemas";
import { shelfObservationsOf } from "./subjects";

const shelfOf =
  ({ user, pages }: Readonly<{ user: string; pages: number }>) =>
  (shelf: string): Effect.Effect<readonly OpenLibraryEntry[], ProviderError> =>
    collectNumberedPages({
      base: `${WEB}/people/${user}/books/${shelf}.json`,
      numbering: { param: "page", limit: 1, start: 1 },
      headers: HEADERS,
      pages,
      schema: ReadingLog,
      itemsOf: ({ reading_log_entries: entries }) => entries,
    });

export const pullOpenlibrary = pullOf({
  provider: "openlibrary",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* openlibrary() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const read = shelfOf({ user, pages });
      return yield* flatMapEach(SHELVES, ({ shelf, kind, context }) =>
        read(shelf).pipe(Effect.map(shelfObservationsOf({ kind, context, fetchedAt }))),
      );
    }),
});
