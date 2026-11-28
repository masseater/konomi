import type { Effect } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import type { ProviderError } from "#/features/ingest-history/model/provider";

export type StatefulPull<State> = Readonly<{
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
}>;

export type ObservedPull = Readonly<{
  cursor: "backfilled" | "kept";
  backfill?: number | undefined;
  observe: (
    pull: Readonly<{ credential: Credential; pages: number; fetchedAt: number }>,
  ) => Observing;
}>;
