import { Effect, Option, pipe } from "effect";

import type { ListingKind } from "#/entities/signal";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import {
  jsonListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, LIMIT, USER_AGENT } from "./api";
import { Listing as ListingBody, Me } from "./schemas";
import { thingOf } from "./subjects";

const listingOf = (user: string, path: string, kind: ListingKind): Listing => {
  const first = `${API}/user/${user}/${path}?limit=${LIMIT}&raw_json=1`;
  return jsonListing({
    kind,
    first,
    schema: ListingBody,
    pageOf: ({ data }) => ({
      items: data.children,
      next: pipe(
        Option.fromNullishOr(data.after),
        Option.map((after) => `${first}&after=${after}`),
      ),
    }),
    subjectOf: (thing) => Option.some(thingOf(thing)),
  });
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
        listingOf(user, "upvoted", "endorsed"),
        listingOf(user, "saved", "collected"),
      ])({ headers, pages, fetchedAt });
    }),
});
