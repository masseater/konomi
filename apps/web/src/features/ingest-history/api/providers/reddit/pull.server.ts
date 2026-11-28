import { Effect, Option } from "effect";

import type { ListingKind } from "#/entities/signal";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import {
  cursorSource,
  listingOf,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, LIMIT, USER_AGENT } from "./api.ts";
import { Listing as ListingBody, Me } from "./schemas.ts";
import { thingOf } from "./subjects.ts";

const savedListingOf = (user: string, path: string, kind: ListingKind): Listing => {
  const source = cursorSource({
    first: `${API}/user/${user}/${path}?limit=${LIMIT}&raw_json=1`,
    param: "after",
    schema: ListingBody,
    itemsOf: ({ data }) => data.children,
    cursorOf: ({ data }) => Option.fromNullishOr(data.after),
  });
  return listingOf({ label: path, source })(
    datedObservationsOf({ kind, subjectOf: (thing) => Option.some(thingOf(thing)) }),
  );
};

export const pullReddit = pullOf({
  provider: "reddit",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* reddit() {
      const headers = { ...(yield* bearerHeadersOf(credential)), "User-Agent": USER_AGENT };
      const { name } = yield* fetchJson({ url: `${API}/api/v1/me`, headers, schema: Me });
      const user = encodeURIComponent(name);
      return yield* pulledListings([
        savedListingOf(user, "upvoted", "endorsed"),
        savedListingOf(user, "saved", "collected"),
      ])({ headers, pages, fetchedAt });
    }),
});
