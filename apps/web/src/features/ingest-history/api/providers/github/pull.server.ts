import { Effect, Function as Fn } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Numbering } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT } from "./api.ts";
import { headersOf } from "./headers.ts";
import { Accounts, Stars } from "./schemas.ts";
import { followObservationsOf, starObservationsOf } from "./subjects.ts";

const NUMBERING: Numbering = { param: "page", limit: LIMIT, start: 1 };

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
          source: sourceOf({
            first: `${API}/users/${user}/starred?per_page=${LIMIT}`,
            next: { number: NUMBERING },
            schema: Stars,
            items: Fn.identity,
          }),
        })(starObservationsOf),
        listingOf({
          label: "following",
          source: sourceOf({
            first: `${API}/users/${user}/following?per_page=${LIMIT}`,
            next: { number: NUMBERING },
            schema: Accounts,
            items: Fn.identity,
          }),
        })(followObservationsOf),
      ]);
      return yield* listings({ headers: headersOf(credential), pages, fetchedAt });
    }),
});
