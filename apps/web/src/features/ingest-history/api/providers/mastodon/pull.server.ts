import { Effect } from "effect";

import { bearerFieldOf } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest-history/api/providers/instance-origin";
import {
  flatListing,
  pulledListings,
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
        flatListing({
          label: "favourites",
          first: `${origin}/api/v1/favourites?limit=${LIMIT}`,
          schema: Statuses,
        })(statusObservationsOf("endorsed")),
        flatListing({
          label: "bookmarks",
          first: `${origin}/api/v1/bookmarks?limit=${LIMIT}`,
          schema: Statuses,
        })(statusObservationsOf("collected")),
        flatListing({
          label: "following",
          first: `${origin}/api/v1/accounts/${id}/following?limit=${LIMIT}`,
          schema: Accounts,
        })(followObservationsOf),
      ]);
      return yield* listings({ headers, pages, fetchedAt });
    }),
});
