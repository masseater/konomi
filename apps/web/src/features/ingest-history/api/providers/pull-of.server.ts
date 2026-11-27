import { Clock, Effect } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import {
  BACKFILLED,
  pagesOf,
  pagesWithin,
} from "#/features/ingest-history/api/providers/backfill-cursor";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

export type Pull = Readonly<{ credential: Credential; pages: number; fetchedAt: number }>;

export const pullOf =
  ({
    provider,
    cursor: kind,
    backfill,
    observe,
  }: Readonly<{
    provider: string;
    cursor: "backfilled" | "kept";
    backfill?: number;
    observe: (pull: Pull) => Effect.Effect<readonly Observation[], ProviderError>;
  }>) =>
  ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
    Effect.gen(function* pullObservations() {
      const fetchedAt = yield* Clock.currentTimeMillis;
      const pages = backfill === undefined ? pagesOf(cursor) : pagesWithin(backfill)(cursor);
      const observations = yield* observe({ credential, pages, fetchedAt });
      return { observations, cursor: kind === "backfilled" ? yield* BACKFILLED : cursor };
    }).pipe(Effect.withSpan(`${provider}.pull`));
