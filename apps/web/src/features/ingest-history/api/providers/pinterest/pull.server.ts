import { Effect, Option } from "effect";

import {
  cursorPageOf,
  listingOf,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, LIMIT } from "./api.ts";
import { Pins } from "./schemas.ts";
import { pinObservationsOf } from "./subjects.ts";

const FIRST = `${API}/pins?page_size=${LIMIT}`;

const pins = listingOf({
  label: "pins",
  source: sourceOf({ first: FIRST, schema: Pins })(
    cursorPageOf({
      param: "bookmark",
      itemsOf: ({ items }) => items,
      cursorOf: ({ bookmark }) => Option.fromNullishOr(bookmark),
    }),
  ),
})(pinObservationsOf);

export const pullPinterest = pullOf({
  provider: "pinterest",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    bearerHeadersOf(credential).pipe(
      Effect.flatMap((headers) => pins({ headers, pages, fetchedAt })),
    ),
});
