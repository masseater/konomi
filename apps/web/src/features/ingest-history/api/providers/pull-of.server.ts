import { Clock, Effect, Match } from "effect";

import type { Credential } from "#/entities/connection";
import { BACKFILLED, pagesWithin } from "#/features/ingest-history/api/providers/backfill-cursor";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { BACKFILL_PAGES } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

export type Pull = Readonly<{ credential: Credential; pages: number; fetchedAt: number }>;

export const pullOf =
  ({
    provider,
    cursor: kind,
    backfill = BACKFILL_PAGES,
    observe,
  }: Readonly<{
    provider: string;
    cursor: "backfilled" | "kept";
    backfill?: number;
    observe: (pull: Pull) => Observing;
  }>) =>
  ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
    Effect.gen(function* pullObservations() {
      const fetchedAt = yield* Clock.currentTimeMillis;
      const observations = yield* observe({
        credential,
        pages: pagesWithin(backfill)(cursor),
        fetchedAt,
      });
      const next = yield* Match.value(kind).pipe(
        Match.when("backfilled", () => BACKFILLED),
        Match.orElse(() => Effect.succeed(cursor)),
      );
      return { observations, cursor: next };
    }).pipe(Effect.withSpan(`${provider}.pull`));
