import { Array as Arr, Effect, Equal, Option, Schema, pipe } from "effect";

import { countBySourceAndKind } from "#/entities/activity/index.server";
import type { KindCount } from "#/entities/activity/index.server";
import type { SourceAccount } from "#/features/ingest/model/source-account";
import type { SyncStatus } from "#/features/ingest/model/sync-status";
import { createRouter } from "#/shared/api/index.server";
import { auth } from "#/shared/auth/index.server";
import { SOURCE_IDS } from "#/shared/config";
import type { ActivityKind, SourceId } from "#/shared/config";
import { runRequest } from "#/shared/observability/index.server";

import { syncAll } from "./run.server";
import { forgetSecret, listAccounts, saveSecret } from "./store.server";

const UNAUTHORIZED = 401;

const SourceParams = Schema.toStandardSchemaV1(
  Schema.Struct({ source: Schema.Literals(SOURCE_IDS) }),
);

const SecretBody = Schema.toStandardSchemaV1(Schema.Struct({ secret: Schema.NonEmptyString }));

type SourceState = Readonly<{
  source: SourceId;
  connection:
    | Readonly<{ status: "unconnected" }>
    | Readonly<{ status: SyncStatus; failure: string; syncedAtMs: number }>;
  totals: readonly Readonly<{ kind: ActivityKind; items: number }>[];
}>;

const isOwner = (request: Request): Effect.Effect<boolean> =>
  Effect.promise(() => auth.api.getSession({ headers: request.headers })).pipe(
    Effect.map((session) => session !== null),
  );

const rejectStranger = <Rejection>({
  request,
  reject,
}: Readonly<{ request: Request; reject: () => Rejection }>): Promise<Rejection | undefined> =>
  Effect.runPromise(
    isOwner(request).pipe(
      Effect.map((owner) =>
        pipe(
          Option.some(owner),
          Option.filter((signedIn) => !signedIn),
          Option.map(reject),
          Option.getOrUndefined,
        ),
      ),
    ),
  );

const connectionOf = (account: Option.Option<SourceAccount>): SourceState["connection"] =>
  Option.match(account, {
    onNone: (): SourceState["connection"] => ({ status: "unconnected" }),
    onSome: ({ status, failure, syncedAtMs }): SourceState["connection"] => ({
      status,
      failure,
      syncedAtMs,
    }),
  });

const stateOf =
  (accounts: readonly SourceAccount[], totals: readonly KindCount[]) =>
  (source: SourceId): SourceState => ({
    source,
    connection: pipe(
      accounts,
      Arr.findFirst((account) => Equal.equals(account.source, source)),
      connectionOf,
    ),
    totals: pipe(
      totals,
      Arr.filter((total) => Equal.equals(total.source, source)),
      Arr.map(({ kind, items }) => ({ kind, items })),
    ),
  });

const statusOf = Effect.all({ accounts: listAccounts, totals: countBySourceAndKind() }).pipe(
  Effect.map(({ accounts, totals }) => pipe(SOURCE_IDS, Arr.map(stateOf(accounts, totals)))),
  Effect.withSpan("ingest.status"),
);

const sourceRoutes = createRouter("/api/sources")
  .onBeforeHandle(({ request, status }) =>
    rejectStranger({ request, reject: () => status(UNAUTHORIZED, "sign in first") }),
  )
  .get("/", () => runRequest(statusOf))
  .put(
    "/:source",
    ({ params, body }) => runRequest(saveSecret({ source: params.source, secret: body.secret })),
    { params: SourceParams, body: SecretBody },
  )
  .delete("/:source", ({ params }) => runRequest(forgetSecret(params.source)), {
    params: SourceParams,
  })
  .post("/sync", () => runRequest(syncAll));

type SourceRoutes = typeof sourceRoutes;

export type { SourceRoutes, SourceState };
export { sourceRoutes };
