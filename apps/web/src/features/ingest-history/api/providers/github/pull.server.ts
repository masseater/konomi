import { Effect, Function as Fn } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { listingOf, pulledListings } from "#/features/ingest-history/api/providers/listing.server";
import { numberedSource } from "#/features/ingest-history/api/providers/numbered-pages.server";
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
        listingOf({
          label: "starred",
          source: numberedSource({
            base: `${API}/users/${user}/starred?per_page=${LIMIT}`,
            numbering: NUMBERING,
            schema: Stars,
            itemsOf: Fn.identity,
          }),
        })(starObservationsOf),
        listingOf({
          label: "following",
          source: numberedSource({
            base: `${API}/users/${user}/following?per_page=${LIMIT}`,
            numbering: NUMBERING,
            schema: Accounts,
            itemsOf: Fn.identity,
          }),
        })(followObservationsOf),
      ]);
      return yield* listings({ headers: headersOf(credential), pages, fetchedAt });
    }),
});
