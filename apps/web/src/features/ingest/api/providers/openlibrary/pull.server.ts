import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

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

const pullOpenlibrary = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* openlibrary() {
    const name = yield* requireField(credential, FIELD.user);
    const user = encodeURIComponent(name);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const read = shelfOf({ user, pages: pagesOf(cursor) });
    const observed = yield* pipe(
      SHELVES,
      Arr.map(({ shelf, kind, context }) =>
        read(shelf).pipe(Effect.map(shelfObservationsOf({ kind, context, fetchedAt }))),
      ),
      Effect.all,
    );
    return { observations: Arr.flatten(observed), cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("openlibrary.pull"));

export { pullOpenlibrary };
