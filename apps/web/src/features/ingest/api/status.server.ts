import { Array as Arr, Effect, Equal, Number, Option, pipe } from "effect";

import type { ConnectionView, SyncStatus } from "#/entities/connection";
import { listConnectionViews } from "#/entities/connection/index.server";
import { countByKind } from "#/entities/signal/index.server";
import type { KindCount, SignalFilter } from "#/entities/signal/index.server";
import type { CredentialMethod } from "#/features/ingest/model/provider";
import { PROVIDER_IDS, SIGNAL_KINDS } from "#/shared/config";
import type { ProviderId, SignalKind } from "#/shared/config";

import { PROVIDERS } from "./providers/index.server";

const ALL_SIGNALS: SignalFilter = {
  keyword: Option.none(),
  kinds: Option.none(),
  types: Option.none(),
  providers: Option.none(),
  sinceMs: Option.none(),
  untilMs: Option.none(),
  limit: 0,
};

type ProviderState = Readonly<{
  provider: ProviderId;
  name: string;
  methods: readonly CredentialMethod[];
  connection:
    | Readonly<{ status: "unconnected" }>
    | Readonly<{ status: SyncStatus; method: string; failure: string; syncedAtMs: number }>;
  totals: readonly Readonly<{ kind: SignalKind; signals: number }>[];
}>;

const connectionOf = (found: Option.Option<ConnectionView>): ProviderState["connection"] =>
  Option.match(found, {
    onNone: (): ProviderState["connection"] => ({ status: "unconnected" }),
    onSome: ({ status, method, failure, syncedAtMs }): ProviderState["connection"] => ({
      status,
      method,
      failure,
      syncedAtMs,
    }),
  });

const NONE = 0;

const totalsOf = (counts: readonly KindCount[], provider: ProviderId): ProviderState["totals"] =>
  pipe(
    SIGNAL_KINDS,
    Arr.map((kind) => ({
      kind,
      signals: pipe(
        counts,
        Arr.filter((row) => Equal.equals(row.provider, provider) && Equal.equals(row.kind, kind)),
        Arr.map(({ signals }) => signals),
        Number.sumAll,
      ),
    })),
    Arr.filter(({ signals }) => signals > NONE),
  );

const stateOf =
  (connections: readonly ConnectionView[], counts: readonly KindCount[]) =>
  ({ id, name, methods }: (typeof PROVIDERS)[ProviderId]): ProviderState => ({
    provider: id,
    name,
    methods,
    connection: pipe(
      connections,
      Arr.findFirst((found) => Equal.equals(found.provider, id)),
      connectionOf,
    ),
    totals: totalsOf(counts, id),
  });

const statusOf = Effect.all({
  connections: listConnectionViews,
  counts: countByKind(ALL_SIGNALS),
}).pipe(
  Effect.map(({ connections, counts }) =>
    pipe(
      PROVIDER_IDS,
      Arr.map((id) => stateOf(connections, counts)(PROVIDERS[id])),
    ),
  ),
  Effect.withSpan("ingest.status"),
);

export type { ProviderState };
export { statusOf };
