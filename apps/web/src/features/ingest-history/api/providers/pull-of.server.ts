import { Clock, Effect, Match } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { BACKFILLED, pagesWithin } from "#/features/ingest-history/api/providers/backfill-cursor";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { BACKFILL_PAGES } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

export type Pull = Readonly<{ credential: Credential; pages: number; fetchedAt: number }>;

export const pullWithState =
  <State>({
    provider,
    state,
    pull,
  }: Readonly<{
    provider: string;
    state: Readonly<{
      read: (cursor: string) => State;
      write: (next: State) => Effect.Effect<string>;
    }>;
    pull: (
      input: Readonly<{ credential: Credential; state: State; fetchedAt: number }>,
    ) => Effect.Effect<
      Readonly<{ observations: readonly Observation[]; state: State }>,
      ProviderError
    >;
  }>) =>
  ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
    Effect.gen(function* pullWithCursorState() {
      const fetchedAt = yield* Clock.currentTimeMillis;
      const pulled = yield* pull({ credential, state: state.read(cursor), fetchedAt });
      return { observations: pulled.observations, cursor: yield* state.write(pulled.state) };
    }).pipe(Effect.withSpan(`${provider}.pull`));

export const pullOf = ({
  provider,
  cursor: kind,
  backfill = BACKFILL_PAGES,
  observe,
}: Readonly<{
  provider: string;
  cursor: "backfilled" | "kept";
  backfill?: number;
  observe: (pull: Pull) => Observing;
}>): ((input: PullInput) => Effect.Effect<Pulled, ProviderError>) =>
  pullWithState({
    provider,
    state: {
      read: (cursor: string): string => cursor,
      write: (cursor: string): Effect.Effect<string> =>
        Match.value(kind).pipe(
          Match.when("backfilled", () => BACKFILLED),
          Match.orElse(() => Effect.succeed(cursor)),
        ),
    },
    pull: ({ credential, state, fetchedAt }) =>
      observe({ credential, pages: pagesWithin(backfill)(state), fetchedAt }).pipe(
        Effect.map((observations) => ({ observations, state })),
      ),
  });
