import { Clock, Effect, Match, Predicate } from "effect";

import { BACKFILLED, pagesWithin } from "#/features/ingest-history/api/providers/backfill-cursor";
import { BACKFILL_PAGES } from "#/features/ingest-history/api/providers/paging.server";
import type {
  ObservedPull,
  StatefulPull,
} from "#/features/ingest-history/api/providers/pull-config";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

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

const isObserved = <State>(config: StatefulPull<State> | ObservedPull): config is ObservedPull =>
  Predicate.hasProperty(config, "observe");

export const pullOf = <State = string>({
  provider,
  ...config
}: Readonly<{ provider: string }> & (StatefulPull<State> | ObservedPull)): ((
  input: PullInput,
) => Effect.Effect<Pulled, ProviderError>) => {
  const pulling =
    <Kept>({ state, pull }: StatefulPull<Kept>) =>
    ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
      Effect.gen(function* pullWithCursorState() {
        const fetchedAt = yield* Clock.currentTimeMillis;
        const pulled = yield* pull({ credential, state: state.read(cursor), fetchedAt });
        return { observations: pulled.observations, cursor: yield* state.write(pulled.state) };
      }).pipe(Effect.withSpan(`${provider}.pull`));
  if (isObserved(config)) {
    return pulling(observedState(config));
  }
  return pulling(config);
};
