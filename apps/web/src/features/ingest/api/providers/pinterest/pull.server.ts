import { Clock, Effect, Option, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { bearerHeadersOf } from "#/features/ingest/api/providers/oauth.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, LIMIT } from "./api";
import { Pins } from "./schemas";
import { pinObservationsOf } from "./subjects";

const pullPinterest = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* pinterest() {
    const headers = yield* bearerHeadersOf(credential);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const first = `${API}/pins?page_size=${LIMIT}`;
    const pins = yield* collectPages({
      first,
      pages: pagesOf(cursor),
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
    return { observations: pinObservationsOf(fetchedAt)(pins), cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("pinterest.pull"));

export { pullPinterest };
