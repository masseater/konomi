import { Effect, Option, pipe } from "effect";

import { pagedListing } from "#/features/ingest-history/api/providers/listing.server";
import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, LIMIT } from "./api";
import { Pins } from "./schemas";
import { pinObservationsOf } from "./subjects";

const FIRST = `${API}/pins?page_size=${LIMIT}`;

const pins = pagedListing({
  first: FIRST,
  schema: Pins,
  pageOf: ({ items, bookmark }) => ({
    items,
    next: pipe(
      Option.fromNullishOr(bookmark),
      Option.map((value) => `${FIRST}&bookmark=${encodeURIComponent(value)}`),
    ),
  }),
  observe: pinObservationsOf,
});

export const pullPinterest = pullOf({
  provider: "pinterest",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    bearerHeadersOf(credential).pipe(
      Effect.flatMap((headers) => pins({ headers, pages, fetchedAt })),
    ),
});
