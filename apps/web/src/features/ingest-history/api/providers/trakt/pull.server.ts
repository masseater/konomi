import { Effect, Function as Fn } from "effect";

import { userClientOf } from "#/features/ingest-history/api/providers/credential-field";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Numbering } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT } from "./api.ts";
import { History, Ratings } from "./schemas.ts";
import { historyObservationsOf, ratingObservationsOf } from "./subjects.ts";

const NUMBERING: Numbering = { param: "page", limit: LIMIT, start: 1 };

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
          source: sourceOf({
            first: `${API}/users/${user}/history?limit=${LIMIT}`,
            next: { number: NUMBERING },
            schema: History,
            items: Fn.identity,
          }),
        })(historyObservationsOf),
        listingOf({
          label: "ratings",
          source: sourceOf({
            first: `${API}/users/${user}/ratings?limit=${LIMIT}`,
            next: { number: NUMBERING },
            schema: Ratings,
            items: Fn.identity,
          }),
        })(ratingObservationsOf),
      ]);
      return yield* listings({ headers, pages, fetchedAt });
    }),
});
