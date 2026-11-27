import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { collectNumberedPages } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { ALL_COLLECTIONS, API, FIELD, LIMIT } from "./api";
import { Raindrops } from "./schemas";
import { raindropObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: LIMIT, start: 0 } as const;

export const pullRaindrop = pullOf({
  provider: "raindrop",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* raindrop() {
      const token = yield* requireField(credential, FIELD.token);
      const raindrops = yield* collectNumberedPages({
        base: `${API}/raindrops/${ALL_COLLECTIONS}?perpage=${LIMIT}&sort=-created`,
        numbering: NUMBERING,
        headers: { Authorization: `Bearer ${token}` },
        pages,
        schema: Raindrops,
        itemsOf: ({ items }) => items,
      });
      return raindropObservationsOf(fetchedAt)(raindrops);
    }),
});
