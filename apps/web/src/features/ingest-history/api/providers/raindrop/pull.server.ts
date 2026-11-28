import { Effect } from "effect";

import { bearerFieldOf } from "#/features/ingest-history/api/providers/credential-field";
import { listingOf } from "#/features/ingest-history/api/providers/listing.server";
import { numberedSource } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { ALL_COLLECTIONS, API, FIELD, LIMIT } from "./api.ts";
import { Raindrops } from "./schemas.ts";
import { raindropObservationsOf } from "./subjects.ts";

const raindrops = listingOf({
  label: "raindrops",
  source: numberedSource({
    base: `${API}/raindrops/${ALL_COLLECTIONS}?perpage=${LIMIT}&sort=-created`,
    numbering: { param: "page", limit: LIMIT, start: 0 },
    schema: Raindrops,
    itemsOf: ({ items }) => items,
  }),
})(raindropObservationsOf);

export const pullRaindrop = pullOf({
  provider: "raindrop",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    bearerFieldOf(FIELD.token)(credential).pipe(
      Effect.flatMap((headers) => raindrops({ headers, pages, fetchedAt })),
    ),
});
