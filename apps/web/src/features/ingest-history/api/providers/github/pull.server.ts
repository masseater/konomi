import { Effect, Function as Fn } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import {
  numberedListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT } from "./api.ts";
import { headersOf } from "./headers.ts";
import { Accounts, Stars } from "./schemas.ts";
import { followObservationsOf, starObservationsOf } from "./subjects.ts";

const NUMBERING = { param: "page", limit: LIMIT, start: 1 } as const;

export const pullGitHub = pullOf({
  provider: "github",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* github() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const listings = pulledListings([
        numberedListing({
          label: "starred",
          base: `${API}/users/${user}/starred?per_page=${LIMIT}`,
          numbering: NUMBERING,
          schema: Stars,
          itemsOf: Fn.identity,
          observe: starObservationsOf,
        }),
        numberedListing({
          label: "following",
          base: `${API}/users/${user}/following?per_page=${LIMIT}`,
          numbering: NUMBERING,
          schema: Accounts,
          itemsOf: Fn.identity,
          observe: followObservationsOf,
        }),
      ]);
      return yield* listings({ headers: headersOf(credential), pages, fetchedAt });
    }),
});
