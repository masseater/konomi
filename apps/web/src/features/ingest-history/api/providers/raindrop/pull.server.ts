import { Clock, Effect } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest-history/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { collectNumberedPages } from "#/features/ingest-history/api/providers/numbered-pages.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

import { ALL_COLLECTIONS, API, FIELD, LIMIT } from "./api";
import { Raindrops } from "./schemas";
import { raindropObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: LIMIT, start: 0 } as const;

export const pullRaindrop = ({
  credential,
  cursor,
}: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* raindrop() {
    const token = yield* requireField(credential, FIELD.token);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const raindrops = yield* collectNumberedPages({
      base: `${API}/raindrops/${ALL_COLLECTIONS}?perpage=${LIMIT}&sort=-created`,
      numbering: NUMBERING,
      headers: { Authorization: `Bearer ${token}` },
      pages: pagesOf(cursor),
      schema: Raindrops,
      itemsOf: ({ items }) => items,
    });
    return {
      observations: raindropObservationsOf(fetchedAt)(raindrops),
      cursor: yield* BACKFILLED,
    };
  }).pipe(Effect.withSpan("raindrop.pull"));
