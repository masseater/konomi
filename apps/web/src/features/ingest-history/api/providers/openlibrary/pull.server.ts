import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { flatMapEach } from "#/features/ingest-history/api/providers/observe";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { FIELD, HEADERS, SHELVES, WEB } from "./api";
import { ReadingLog } from "./schemas";
import type { OpenLibraryEntry } from "./schemas";
import { shelfObservationsOf } from "./subjects";

const PAGE = "page";
const NEXT = 1;

const nextPageOf =
  (url: string) =>
  (entries: readonly OpenLibraryEntry[]): Option.Option<string> =>
    pipe(
      Option.liftPredicate(entries, Arr.isReadonlyArrayNonEmpty),
      Option.map(() => {
        const next = new URL(url);
        const current = Number(next.searchParams.get(PAGE));
        next.searchParams.set(PAGE, String(current + NEXT));
        return next.toString();
      }),
    );

const shelfOf =
  ({ user, pages }: Readonly<{ user: string; pages: number }>) =>
  (shelf: string): Effect.Effect<readonly OpenLibraryEntry[], ProviderError> =>
    collectPages({
      first: `${WEB}/people/${user}/books/${shelf}.json?${PAGE}=${NEXT}`,
      pages,
      fetchPage: (url) =>
        fetchJson({ url, headers: HEADERS, schema: ReadingLog }).pipe(
          Effect.map(({ reading_log_entries: entries }) => ({
            items: entries,
            next: nextPageOf(url)(entries),
          })),
        ),
    });

export const pullOpenlibrary = pullOf({
  provider: "openlibrary",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* openlibrary() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const read = shelfOf({ user, pages: pages });
      return yield* flatMapEach(SHELVES, ({ shelf, kind, context }) =>
        read(shelf).pipe(Effect.map(shelfObservationsOf({ kind, context, fetchedAt }))),
      );
    }),
});
