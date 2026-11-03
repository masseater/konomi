import {
  Array as Arr,
  Effect,
  Match,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { forgetConnection, saveCredential } from "#/entities/connection/index.server";
import { createRouter } from "#/shared/api/index.server";
import { auth } from "#/shared/auth/index.server";
import { PROVIDER_IDS } from "#/shared/config";
import type { ProviderId } from "#/shared/config";
import { runRequest } from "#/shared/observability/index.server";

import {
  appleDeveloperTokenResponse,
  authorizeResponse,
  callbackResponse,
  ImportBody,
  importResponse,
  saveAppleUserTokenResponse,
} from "./handlers.server";
import { PROVIDERS } from "./providers/index.server";
import { statusOf } from "./status.server";
import { syncAll } from "./sync.server";

const UNAUTHORIZED = 401;
const BAD_REQUEST = 400;

const ProviderParams = Schema.toStandardSchemaV1(
  Schema.Struct({ provider: Schema.Literals(PROVIDER_IDS) }),
);

const CredentialBody = Schema.toStandardSchemaV1(
  Schema.Struct({
    method: Schema.NonEmptyString,
    fields: Schema.Record(Schema.String, Schema.String),
  }),
);

const UserTokenBody = Schema.toStandardSchemaV1(Schema.Struct({ token: Schema.NonEmptyString }));

const CallbackQuery = Schema.toStandardSchemaV1(
  Schema.Struct({
    code: Schema.optional(Schema.String),
    state: Schema.optional(Schema.String),
  }),
);

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

const knowsMethod = (provider: ProviderId, method: string): boolean =>
  pipe(
    PROVIDERS[provider].methods,
    Arr.some(({ id }) => id === method),
  );

const filledFields = (fields: Readonly<Record<string, string>>): Record<string, string> =>
  pipe(
    fields,
    Rec.map((value) => Str.trim(value)),
    Rec.filter((value) => Str.isNonEmpty(value)),
  );

const connectionRoutes = createRouter("/api/connections")
  .onBeforeHandle(({ request, status }) =>
    rejectStranger({ request, reject: () => status(UNAUTHORIZED, "sign in first") }),
  )
  .get("/", () => runRequest(statusOf))
  .put(
    "/:provider",
    ({ params, body, status }) =>
      Match.value(knowsMethod(params.provider, body.method)).pipe(
        Match.when(true, () =>
          runRequest(
            saveCredential({
              provider: params.provider,
              credential: { method: body.method, fields: filledFields(body.fields) },
            }),
          ),
        ),
        Match.orElse(() => status(BAD_REQUEST, "unknown method")),
      ),
    { params: ProviderParams, body: CredentialBody },
  )
  .delete("/:provider", ({ params }) => runRequest(forgetConnection(params.provider)), {
    params: ProviderParams,
  })
  .post(
    "/:provider/imports",
    ({ params, body }) =>
      runRequest(
        importResponse({ provider: params.provider, ...body, fields: filledFields(body.fields) }),
      ),
    { params: ProviderParams, body: ImportBody },
  )
  .get("/:provider/authorize", ({ params }) => runRequest(authorizeResponse(params.provider)), {
    params: ProviderParams,
  })
  .get(
    "/:provider/callback",
    ({ params, query }) => runRequest(callbackResponse({ provider: params.provider, query })),
    {
      params: ProviderParams,
      query: CallbackQuery,
    },
  )
  .get("/apple-music/developer-token", () => runRequest(appleDeveloperTokenResponse))
  .put(
    "/apple-music/user-token",
    ({ body }) => runRequest(saveAppleUserTokenResponse(body.token)),
    {
      body: UserTokenBody,
    },
  )
  .post("/sync", () => runRequest(syncAll));

type ConnectionRoutes = typeof connectionRoutes;

export type { ImportView, ProviderState } from "./status.server";
export type { ConnectionRoutes };
export { connectionRoutes };
