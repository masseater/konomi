import { Clock, Effect } from "effect";

import { recordActivities } from "#/entities/activity/index.server";
import type { Source } from "#/features/ingest/model/source";
import type { SourceAccount } from "#/features/ingest/model/source-account";
import type { SourceError } from "#/features/ingest/model/source-error";
import { NEVER_SYNCED } from "#/features/ingest/model/sync-status";
import type { SourceId } from "#/shared/config";

import { niconico } from "./niconico.server";
import { listAccounts, openAccountSecret, recordOutcome } from "./store.server";
import type { SyncOutcome } from "./store.server";

const SOURCES: Readonly<Record<SourceId, Source>> = { niconico };

const collectFor = (account: SourceAccount): Effect.Effect<number, SourceError> =>
  openAccountSecret(account).pipe(
    Effect.flatMap((secret) =>
      SOURCES[account.source].collect(secret, {
        backfill: account.syncedAtMs === NEVER_SYNCED,
      }),
    ),
    Effect.flatMap(recordActivities),
  );

const failed =
  (status: "rejected" | "failed") =>
  ({ message }: Readonly<{ message: string }>): Effect.Effect<SyncOutcome> =>
    Effect.succeed({ status, failure: message });

const syncAccount = (account: SourceAccount): Effect.Effect<void> =>
  collectFor(account).pipe(
    Effect.tap((rows) => Effect.logInfo("source synced").pipe(Effect.annotateLogs({ rows }))),
    Effect.andThen(Clock.currentTimeMillis),
    Effect.map((atMs): SyncOutcome => ({ status: "synced", atMs })),
    Effect.tapError((cause) => Effect.logWarning("source sync failed", cause)),
    Effect.catchTags({
      CredentialRejected: failed("rejected"),
      SourceUnavailable: failed("failed"),
    }),
    Effect.flatMap((outcome) => recordOutcome({ source: account.source, outcome })),
    Effect.annotateLogs({ source: account.source }),
    Effect.withSpan("ingest.sync", { attributes: { source: account.source } }),
  );

const syncAll: Effect.Effect<void> = listAccounts.pipe(
  Effect.flatMap((accounts) => Effect.forEach(accounts, syncAccount, { discard: true })),
  Effect.withSpan("ingest.run"),
);

export { syncAll };
