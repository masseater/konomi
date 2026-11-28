import { Effect } from "effect";

import { bearerFieldOf } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest-history/api/providers/instance-origin";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FIELD, LIMIT } from "./api.ts";
import { Accounts, Statuses, Verified } from "./schemas.ts";
import { followObservationsOf, statusObservationsOf } from "./subjects.ts";

export const pullMastodon = pullOf({
  provider: "mastodon",
  cursor: "kept",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* mastodon() {
      const origin = yield* instanceOriginOf(FIELD.instance)(credential);
      const headers = yield* bearerFieldOf(FIELD.accessToken)(credential);
      const { id } = yield* fetchJson({
        url: `${origin}/api/v1/accounts/verify_credentials`,
        headers,
        schema: Verified,
      });
      const listings = pulledListings([
        listingOf({
          label: "favourites",
          source: sourceOf({
            first: `${origin}/api/v1/favourites?limit=${LIMIT}`,
            schema: Statuses,
            items: (items) => items,
          }),
        })(statusObservationsOf("endorsed")),
        listingOf({
          label: "bookmarks",
          source: sourceOf({
            first: `${origin}/api/v1/bookmarks?limit=${LIMIT}`,
            schema: Statuses,
            items: (items) => items,
          }),
        })(statusObservationsOf("collected")),
        listingOf({
          label: "following",
          source: sourceOf({
            first: `${origin}/api/v1/accounts/${id}/following?limit=${LIMIT}`,
            schema: Accounts,
            items: (items) => items,
          }),
        })(followObservationsOf),
      ]);
      return yield* listings({ headers, pages, fetchedAt });
    }),
});
