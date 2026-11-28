import { Effect } from "effect";
import type { Schema } from "effect";

import { bearerFieldOf } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest-history/api/providers/instance-origin";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Observer } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FIELD, LIMIT } from "./api.ts";
import { Accounts, Statuses, Verified } from "./schemas.ts";
import { followObservationsOf, statusObservationsOf } from "./subjects.ts";

const listingAt =
  <Item>({
    origin,
    path,
    schema,
  }: Readonly<{ origin: string; path: string; schema: Schema.Decoder<readonly Item[]> }>) =>
  (observe: Observer<Item>): Listing =>
    listingOf({
      label: path,
      source: sourceOf({ first: `${origin}/api/v1/${path}?limit=${LIMIT}`, schema })((items) =>
        pageOf({ items }),
      ),
    })(observe);

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
        listingAt({ origin, path: "favourites", schema: Statuses })(
          statusObservationsOf("endorsed"),
        ),
        listingAt({ origin, path: "bookmarks", schema: Statuses })(
          statusObservationsOf("collected"),
        ),
        listingAt({ origin, path: `accounts/${id}/following`, schema: Accounts })(
          followObservationsOf,
        ),
      ]);
      return yield* listings({ headers, pages, fetchedAt });
    }),
});
