import { eq } from "drizzle-orm";
import { Array as Arr, Clock, Effect, Match, Schema, Struct } from "effect";

import type { Connection, ConnectionView } from "#/entities/connection/model/connection";
import { connection } from "#/entities/connection/model/connection.table";
import { CredentialSchema } from "#/entities/connection/model/credential";
import type { Credential } from "#/entities/connection/model/credential";
import type { SyncStatus } from "#/entities/connection/model/sync-status";
import type { ProviderId } from "#/shared/config";
import { openSecret, sealSecret } from "#/shared/crypto/index.server";
import { db } from "#/shared/db/index.server";

const NO_FAILURE = "";
const CredentialJson = Schema.fromJsonString(CredentialSchema);
const encodeCredential = Schema.encodeEffect(CredentialJson);
const decodeCredential = Schema.decodeEffect(CredentialJson);

export type SyncOutcome =
  | Readonly<{ status: "synced"; atMs: number; cursor: string }>
  | Readonly<{ status: Exclude<SyncStatus, "synced" | "waiting">; failure: string }>;

const sealCredential = (credential: Credential): Effect.Effect<string> =>
  encodeCredential(credential).pipe(Effect.orDie, Effect.flatMap(sealSecret));

type Sealing = Readonly<{ provider: ProviderId; credential: Credential }>;

const writeSealed = ({
  provider,
  credential,
  span,
  write,
}: Sealing &
  Readonly<{
    span: string;
    write: (
      sealed: Readonly<{ sealedCredential: string; updatedAtMs: number }>,
    ) => Promise<unknown>;
  }>): Effect.Effect<void> =>
  Effect.all(
    {
      sealedCredential: sealCredential(credential),
      updatedAtMs: Clock.currentTimeMillis,
    },
    { concurrency: 1 },
  ).pipe(
    Effect.flatMap((sealed) => Effect.promise(() => write(sealed))),
    Effect.asVoid,
    Effect.withSpan(span, { attributes: { provider } }),
  );

export const saveCredential = ({ provider, credential }: Sealing): Effect.Effect<void> =>
  writeSealed({
    provider,
    credential,
    span: "connection.save",
    write: ({ sealedCredential, updatedAtMs }) =>
      db
        .insert(connection)
        .values({ provider, method: credential.method, sealedCredential, updatedAtMs })
        .onConflictDoUpdate({
          target: connection.provider,
          set: {
            method: credential.method,
            sealedCredential,
            status: "waiting",
            failure: NO_FAILURE,
            updatedAtMs,
          },
        }),
  });

export const replaceCredential = ({ provider, credential }: Sealing): Effect.Effect<void> =>
  writeSealed({
    provider,
    credential,
    span: "connection.replace-credential",
    write: ({ sealedCredential }) =>
      db.update(connection).set({ sealedCredential }).where(eq(connection.provider, provider)),
  });

export const forgetConnection = (provider: ProviderId): Effect.Effect<void> =>
  Effect.promise(() => db.delete(connection).where(eq(connection.provider, provider))).pipe(
    Effect.asVoid,
    Effect.withSpan("connection.forget", { attributes: { provider } }),
  );

export const listConnections: Effect.Effect<readonly Connection[]> = Effect.promise(() =>
  db.select().from(connection),
).pipe(Effect.withSpan("connection.list"));

const viewOf = (row: Connection): ConnectionView =>
  Struct.omit(row, ["sealedCredential", "cursor"]);

export const listConnectionViews: Effect.Effect<readonly ConnectionView[]> = listConnections.pipe(
  Effect.map(Arr.map(viewOf)),
);

export const openCredential = ({ sealedCredential }: Connection): Effect.Effect<Credential> =>
  openSecret(sealedCredential).pipe(Effect.flatMap(decodeCredential), Effect.orDie);

const changesOf = (outcome: SyncOutcome): Partial<Connection> =>
  Match.value(outcome).pipe(
    Match.when({ status: "synced" }, ({ status, atMs, cursor }) => ({
      status,
      cursor,
      failure: NO_FAILURE,
      syncedAtMs: atMs,
    })),
    Match.orElse(({ status, failure }) => ({ status, failure })),
  );

export const recordOutcome = ({
  provider,
  outcome,
}: Readonly<{ provider: ProviderId; outcome: SyncOutcome }>): Effect.Effect<void> =>
  Effect.promise(() =>
    db.update(connection).set(changesOf(outcome)).where(eq(connection.provider, provider)),
  ).pipe(Effect.asVoid);
