import {
  Client,
  SdkHttpError,
  StreamableHTTPClientTransport,
  UnauthorizedError,
} from "@modelcontextprotocol/client";
import type { TextContent } from "@modelcontextprotocol/client";
import { Array as Arr, Effect, Match, Option, pipe } from "effect";
import type { Scope } from "effect";

import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

const CLIENT = { name: "konomi", version: "1.0.0" } as const;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const REJECTING_STATUSES: ReadonlySet<number> = new Set([UNAUTHORIZED, FORBIDDEN]);

const rejects = (cause: unknown): boolean =>
  cause instanceof UnauthorizedError ||
  (SdkHttpError.isInstance(cause) && REJECTING_STATUSES.has(cause.status));

const failureOf = (cause: unknown): ProviderError =>
  Match.value(cause).pipe(
    Match.when(rejects, () =>
      CredentialRejected.make({ message: "MCP サーバーがトークンを断った" }),
    ),
    Match.orElse(() =>
      ProviderUnavailable.make({ message: `MCP の呼び出しに失敗した: ${String(cause)}` }),
    ),
  );

const connected = ({
  resource,
  accessToken,
}: Readonly<{ resource: string; accessToken: string }>): Effect.Effect<
  Client,
  ProviderError,
  Scope.Scope
> =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => {
        const client = new Client(CLIENT);
        const transport = new StreamableHTTPClientTransport(new URL(resource), {
          requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
        });
        return client.connect(transport).then(() => client);
      },
      catch: failureOf,
    }),
    (client) => Effect.promise(() => client.close()),
  );

const callTool = ({
  resource,
  accessToken,
  name,
  args,
}: Readonly<{
  resource: string;
  accessToken: string;
  name: string;
  args: Readonly<Record<string, string | number | boolean>>;
}>): Effect.Effect<string, ProviderError> =>
  Effect.scoped(
    connected({ resource, accessToken }).pipe(
      Effect.flatMap((client) =>
        Effect.tryPromise({
          try: () => client.callTool({ name, arguments: { ...args } }),
          catch: failureOf,
        }),
      ),
      Effect.flatMap((result) =>
        pipe(
          Option.liftPredicate(result, (answered) => answered.isError !== true),
          Option.flatMap(({ content }) =>
            Arr.findFirst(content, (block): block is TextContent => block.type === "text"),
          ),
          Option.map(({ text }) => text),
          Effect.fromOption,
          Effect.mapError(() => ProviderUnavailable.make({ message: "MCP の答えに文が無い" })),
        ),
      ),
    ),
  ).pipe(Effect.withSpan("mcp.call_tool", { attributes: { resource, name } }));

export { callTool };
