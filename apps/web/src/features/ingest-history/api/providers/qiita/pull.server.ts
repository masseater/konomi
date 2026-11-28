import { Effect } from "effect";

import {
  fieldOf,
  optionalBearerOf,
  requireField,
} from "#/features/ingest-history/api/providers/credential-field";
import { listingOf } from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { numberedSource } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT } from "./api.ts";
import { Items } from "./schemas.ts";
import { stockObservationsOf } from "./subjects.ts";

const stocksOf = (user: string): Listing =>
  listingOf({
    label: "stocks",
    source: numberedSource({
      base: `${API}/users/${user}/stocks?per_page=${LIMIT}`,
      numbering: { param: "page", limit: LIMIT, start: 1 },
      schema: Items,
      itemsOf: (items) => items,
    }),
  })(stockObservationsOf);

export const pullQiita = pullOf({
  provider: "qiita",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    requireField(credential, FIELD.user).pipe(
      Effect.flatMap((name) =>
        stocksOf(encodeURIComponent(name))({
          headers: optionalBearerOf(fieldOf(credential, FIELD.token)),
          pages,
          fetchedAt,
        }),
      ),
    ),
});
