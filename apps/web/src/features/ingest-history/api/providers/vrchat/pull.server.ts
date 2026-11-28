import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import type { Numbering } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, HEADERS, LIMIT } from "./api.ts";
import { Friends, Works } from "./schemas.ts";
import { favoriteObservationsOf, friendObservationsOf } from "./subjects.ts";
import type { WorkKind } from "./subjects.ts";

const NUMBERING: Numbering = { param: "offset", limit: LIMIT, start: 0, step: LIMIT };

const favorites = (kind: WorkKind): Listing =>
  listingOf({
    label: `${kind}-favorites`,
    source: sourceOf({
      first: `${API}/${kind}s/favorites?n=${LIMIT}`,
      next: { number: NUMBERING },
      schema: Works,
      items: (works) => works,
    }),
  })(favoriteObservationsOf(kind));

const friends = (offline: boolean): Listing =>
  listingOf({
    label: `friends-offline-${String(offline)}`,
    source: sourceOf({
      first: `${API}/auth/user/friends?n=${LIMIT}&offline=${String(offline)}`,
      next: { number: NUMBERING },
      schema: Friends,
      items: (people) => people,
    }),
  })(friendObservationsOf);

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
