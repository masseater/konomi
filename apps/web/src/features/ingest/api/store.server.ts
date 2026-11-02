import { eq } from "drizzle-orm";
import { Clock, Effect, Match } from "effect";

import type { SourceAccount } from "#/features/ingest/model/source-account";
import { sourceAccount } from "#/features/ingest/model/source-account.table";
import type { SyncStatus } from "#/features/ingest/model/sync-status";
import type { SourceId } from "#/shared/config";
import { openSecret, sealSecret } from "#/shared/crypto/index.server";
import { db } from "#/shared/db/index.server";

const NO_FAILURE = "";

type SyncOutcome =
  | Readonly<{ status: "synced"; atMs: number }>
  | Readonly<{ status: Exclude<SyncStatus, "synced" | "waiting">; failure: string }>;

const saveSecret = ({
  source,
  secret,
}: Readonly<{ source: SourceId; secret: string }>): Effect.Effect<void> =>
  Effect.all({ sealedSecret: sealSecret(secret), updatedAtMs: Clock.currentTimeMillis }).pipe(
    Effect.flatMap(({ sealedSecret, updatedAtMs }) =>
      Effect.promise(() =>
        db
          .insert(sourceAccount)
          .values({ source, sealedSecret, updatedAtMs })
          .onConflictDoUpdate({
            target: sourceAccount.source,
            set: { sealedSecret, status: "waiting", failure: NO_FAILURE, updatedAtMs },
          }),
      ),
    ),
    Effect.asVoid,
    Effect.withSpan("source-account.save", { attributes: { source } }),
  );

const forgetSecret = (source: SourceId): Effect.Effect<void> =>
  Effect.promise(() => db.delete(sourceAccount).where(eq(sourceAccount.source, source))).pipe(
    Effect.asVoid,
    Effect.withSpan("source-account.forget", { attributes: { source } }),
  );

const listAccounts: Effect.Effect<readonly SourceAccount[]> = Effect.promise(() =>
  db.select().from(sourceAccount),
).pipe(Effect.withSpan("source-account.list"));

const openAccountSecret = ({ sealedSecret }: SourceAccount): Effect.Effect<string> =>
  openSecret(sealedSecret);

const changesOf = (outcome: SyncOutcome): Partial<SourceAccount> =>
  Match.value(outcome).pipe(
    Match.when({ status: "synced" }, ({ status, atMs }) => ({
      status,
      failure: NO_FAILURE,
      syncedAtMs: atMs,
    })),
    Match.orElse(({ status, failure }) => ({ status, failure })),
  );

const recordOutcome = ({
  source,
  outcome,
}: Readonly<{ source: SourceId; outcome: SyncOutcome }>): Effect.Effect<void> =>
  Effect.promise(() =>
    db.update(sourceAccount).set(changesOf(outcome)).where(eq(sourceAccount.source, source)),
  ).pipe(Effect.asVoid);

export type { SyncOutcome };
export { forgetSecret, listAccounts, openAccountSecret, recordOutcome, saveSecret };
