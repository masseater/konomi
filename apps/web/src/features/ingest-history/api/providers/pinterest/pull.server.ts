import { Effect, Option, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, LIMIT } from "./api";
import { Pins } from "./schemas";
import { pinObservationsOf } from "./subjects";

export const pullPinterest = pullOf({
  provider: "pinterest",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* pinterest() {
      const headers = yield* bearerHeadersOf(credential);
      const first = `${API}/pins?page_size=${LIMIT}`;
      const pins = yield* collectPages({
        first,
        pages,
        fetchPage: (url) =>
          fetchJson({ url, headers, schema: Pins }).pipe(
            Effect.map(({ items, bookmark }) => ({
              items,
              next: pipe(
                Option.fromNullishOr(bookmark),
                Option.map((value) => `${first}&bookmark=${encodeURIComponent(value)}`),
              ),
            })),
          ),
      });
      return pinObservationsOf(fetchedAt)(pins);
    }),
});
