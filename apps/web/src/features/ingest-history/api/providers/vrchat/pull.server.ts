import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import {
  numberedListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, HEADERS, LIMIT } from "./api.ts";
import { Friends, Works } from "./schemas.ts";
import { favoriteObservationsOf, friendObservationsOf } from "./subjects.ts";
import type { WorkKind } from "./subjects.ts";

const NUMBERING = { param: "offset", limit: LIMIT, start: 0, step: LIMIT } as const;

const favorites = (kind: WorkKind): Listing =>
  numberedListing({
    label: `${kind}-favorites`,
    base: `${API}/${kind}s/favorites?n=${LIMIT}`,
    numbering: NUMBERING,
    schema: Works,
    itemsOf: (works) => works,
    observe: (fetchedAt) => favoriteObservationsOf({ kind, fetchedAt }),
  });

const friends = (offline: boolean): Listing =>
  numberedListing({
    label: `friends-offline-${String(offline)}`,
    base: `${API}/auth/user/friends?n=${LIMIT}&offline=${String(offline)}`,
    numbering: NUMBERING,
    schema: Friends,
    itemsOf: (people) => people,
    observe: friendObservationsOf,
  });

const listings = pulledListings([
  favorites("world"),
  favorites("avatar"),
  friends(false),
  friends(true),
]);

export const pullVrchat = pullOf({
  provider: "vrchat",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    requireField(credential, FIELD.auth).pipe(
      Effect.flatMap((auth) =>
        listings({ headers: { ...HEADERS, Cookie: `auth=${auth}` }, pages, fetchedAt }),
      ),
    ),
});
