import { Effect, Function as Fn } from "effect";

import { userClientOf } from "#/features/ingest-history/api/providers/credential-field";
import { listingOf, pulledListings } from "#/features/ingest-history/api/providers/listing.server";
import { numberedSource } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT } from "./api.ts";
import { History, Ratings } from "./schemas.ts";
import { historyObservationsOf, ratingObservationsOf } from "./subjects.ts";

const NUMBERING = { param: "page", limit: LIMIT, start: 1 } as const;

export const pullTrakt = pullOf({
  provider: "trakt",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* trakt() {
      const { user, clientId } = yield* userClientOf(credential, FIELD);
      const headers = {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientId,
      };
      const listings = pulledListings([
        listingOf({
          label: "history",
          source: numberedSource({
            base: `${API}/users/${user}/history?limit=${LIMIT}`,
            numbering: NUMBERING,
            schema: History,
            itemsOf: Fn.identity,
          }),
        })(historyObservationsOf),
        listingOf({
          label: "ratings",
          source: numberedSource({
            base: `${API}/users/${user}/ratings?limit=${LIMIT}`,
            numbering: NUMBERING,
            schema: Ratings,
            itemsOf: Fn.identity,
          }),
        })(ratingObservationsOf),
      ]);
      return yield* listings({ headers, pages, fetchedAt });
    }),
});
