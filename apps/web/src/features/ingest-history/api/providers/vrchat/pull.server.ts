import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { listingOf, pulledListings } from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { numberedSource } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, HEADERS, LIMIT } from "./api.ts";
import { Friends, Works } from "./schemas.ts";
import { favoriteObservationsOf, friendObservationsOf } from "./subjects.ts";
import type { WorkKind } from "./subjects.ts";

const NUMBERING = { param: "offset", limit: LIMIT, start: 0, step: LIMIT } as const;

const favorites = (kind: WorkKind): Listing =>
  listingOf({
    label: `${kind}-favorites`,
    source: numberedSource({
      base: `${API}/${kind}s/favorites?n=${LIMIT}`,
      numbering: NUMBERING,
      schema: Works,
      itemsOf: (works) => works,
    }),
  })(favoriteObservationsOf(kind));

const friends = (offline: boolean): Listing =>
  listingOf({
    label: `friends-offline-${String(offline)}`,
    source: numberedSource({
      base: `${API}/auth/user/friends?n=${LIMIT}&offline=${String(offline)}`,
      numbering: NUMBERING,
      schema: Friends,
      itemsOf: (people) => people,
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
