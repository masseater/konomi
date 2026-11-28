import { Array as Arr, Effect, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FIELD, HEADERS, SHELVES, WEB } from "./api.ts";
import { ReadingLog } from "./schemas.ts";
import { shelfObservationsOf } from "./subjects.ts";

export const pullOpenlibrary = pullOf({
  provider: "openlibrary",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* openlibrary() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const shelves = pipe(
        SHELVES,
        Arr.map(({ shelf, kind, context }) =>
          listingOf({
            label: shelf,
            source: sourceOf({
              first: `${WEB}/people/${user}/books/${shelf}.json`,
              next: { number: { param: "page", limit: 1, start: 1 } },
              schema: ReadingLog,
              items: ({ reading_log_entries: entries }) => entries,
            }),
          })(shelfObservationsOf({ kind, context })),
        ),
      );
      return yield* pulledListings(shelves)({ headers: HEADERS, pages, fetchedAt });
    }),
});
