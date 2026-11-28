import { Clock, Effect, Match, Predicate } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { BACKFILLED, pagesWithin } from "#/features/ingest-history/api/providers/backfill-cursor";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { BACKFILL_PAGES } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

type Pull = Readonly<{ credential: Credential; pages: number; fetchedAt: number }>;

type StateSpec<State> = Readonly<{
  read: (cursor: string) => State;
  write: (next: State) => Effect.Effect<string>;
}>;

type StatefulPull<State> = Readonly<{
  state: StateSpec<State>;
  pull: (
    input: Readonly<{ credential: Credential; state: State; fetchedAt: number }>,
  ) => Effect.Effect<
    Readonly<{ observations: readonly Observation[]; state: State }>,
    ProviderError
  >;
}>;

type ObservedPull = Readonly<{
  cursor: "backfilled" | "kept";
  backfill?: number | undefined;
  observe: (pull: Pull) => Observing;
}>;

const observedState = ({
  cursor: kind,
  backfill = BACKFILL_PAGES,
  observe,
}: ObservedPull): StatefulPull<string> => ({
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

const pulling =
  <State>(provider: string, { state, pull }: StatefulPull<State>) =>
  ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
    Effect.gen(function* pullWithCursorState() {
      const fetchedAt = yield* Clock.currentTimeMillis;
      const pulled = yield* pull({ credential, state: state.read(cursor), fetchedAt });
      return { observations: pulled.observations, cursor: yield* state.write(pulled.state) };
    }).pipe(Effect.withSpan(`${provider}.pull`));

const isObserved = <State>(config: StatefulPull<State> | ObservedPull): config is ObservedPull =>
  Predicate.hasProperty(config, "observe");

export const pullOf = <State = string>({
  provider,
  ...config
}: Readonly<{ provider: string }> &
  (
    | Readonly<{
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
      }>
    | Readonly<{
        cursor: "backfilled" | "kept";
        backfill?: number | undefined;
        observe: (
          pull: Readonly<{ credential: Credential; pages: number; fetchedAt: number }>,
        ) => Observing;
      }>
  )): ((input: PullInput) => Effect.Effect<Pulled, ProviderError>) => {
  if (isObserved(config)) {
    return pulling(provider, observedState(config));
  }
  return pulling(provider, config);
};
