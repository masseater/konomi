import { Array as Arr, Clock, Effect, Match, Option, pipe } from "effect";

import type { Connection, Credential } from "#/entities/connection";
import {
  listConnections,
  openCredential,
  recordOutcome,
  replaceCredential,
} from "#/entities/connection/index.server";
import type { SyncOutcome } from "#/entities/connection/index.server";
import { recordObservations } from "#/entities/signal/index.server";
import type { Provider, ProviderError, Pulled } from "#/features/ingest/model/provider";

import { PROVIDERS } from "./providers/index.server";

const renews = (provider: Provider, credential: Credential): boolean =>
  pipe(
    provider.methods,
    Arr.some(({ id, renews: renewable }) => renewable && id === credential.method),
  );

const renewAndPull = ({
  provider,
  credential,
  cursor,
}: Readonly<{ provider: Provider; credential: Credential; cursor: string }>): Effect.Effect<
  Pulled,
  ProviderError
> =>
  provider.renew(credential).pipe(
    Effect.tap((renewed) => replaceCredential({ provider: provider.id, credential: renewed })),
    Effect.tap(() => Effect.logInfo("credential renewed")),
    Effect.flatMap((renewed) => provider.pull({ credential: renewed, cursor })),
  );

const pullFor = (connection: Connection): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* pull() {
    const provider = PROVIDERS[connection.provider];
    const credential = yield* openCredential(connection);
    const { cursor } = connection;
    return yield* provider.pull({ credential, cursor }).pipe(
      Effect.catchTag("CredentialRejected", (rejected) =>
        Match.value(renews(provider, credential)).pipe(
          Match.when(true, () => renewAndPull({ provider, credential, cursor })),
          Match.orElse(() => Effect.fail(rejected)),
        ),
      ),
    );
  });

const storePulled = (connection: Connection, pulled: Pulled): Effect.Effect<SyncOutcome> =>
  Effect.gen(function* store() {
    yield* recordObservations(pulled.observations);
    yield* Option.match(Option.fromUndefinedOr(pulled.credential), {
      onNone: () => Effect.void,
      onSome: (credential) => replaceCredential({ provider: connection.provider, credential }),
    });
    yield* Effect.logInfo("provider synced").pipe(
      Effect.annotateLogs({ observations: pulled.observations.length }),
    );
    return {
      status: "synced" as const,
      atMs: yield* Clock.currentTimeMillis,
      cursor: pulled.cursor,
    };
  });

const failed =
  (status: "rejected" | "failed") =>
  ({ message }: Readonly<{ message: string }>): Effect.Effect<SyncOutcome> =>
    Effect.succeed({ status, failure: message });

const syncConnection = (connection: Connection): Effect.Effect<void> =>
  pullFor(connection).pipe(
    Effect.flatMap((pulled) => storePulled(connection, pulled)),
    Effect.tapError((cause) => Effect.logWarning("provider sync failed", cause)),
    Effect.catchTags({
      CredentialRejected: failed("rejected"),
      ProviderUnavailable: failed("failed"),
    }),
    Effect.flatMap((outcome) => recordOutcome({ provider: connection.provider, outcome })),
    Effect.annotateLogs({ provider: connection.provider }),
    Effect.withSpan("ingest.sync", { attributes: { provider: connection.provider } }),
  );

const syncAll: Effect.Effect<void> = listConnections.pipe(
  Effect.flatMap((connections) => Effect.forEach(connections, syncConnection, { discard: true })),
  Effect.withSpan("ingest.run"),
);

export { syncAll };
