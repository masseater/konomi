import { Effect } from "effect";

import { bearerFieldOf } from "#/features/ingest-history/api/providers/credential-field";
import { numberedListing } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { ALL_COLLECTIONS, API, FIELD, LIMIT } from "./api.ts";
import { Raindrops } from "./schemas.ts";
import { raindropObservationsOf } from "./subjects.ts";

const raindrops = numberedListing({
  label: "raindrops",
  base: `${API}/raindrops/${ALL_COLLECTIONS}?perpage=${LIMIT}&sort=-created`,
  numbering: { param: "page", limit: LIMIT, start: 0 },
  schema: Raindrops,
  itemsOf: ({ items }) => items,
  observe: raindropObservationsOf,
});

export const pullRaindrop = pullOf({
  provider: "raindrop",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    bearerFieldOf(FIELD.token)(credential).pipe(
      Effect.flatMap((headers) => raindrops({ headers, pages, fetchedAt })),
    ),
});
