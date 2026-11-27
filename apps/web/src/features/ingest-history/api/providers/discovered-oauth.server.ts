import {
  OAuthError,
  exchangeAuthorization,
  refreshAuthorization,
  startAuthorization,
} from "@modelcontextprotocol/client";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { fieldOf, requireField } from "#/features/ingest-history/api/providers/credential-field";
import { postJson } from "#/features/ingest-history/api/providers/http.server";
import { OAUTH_FIELD, withTokens } from "#/features/ingest-history/api/providers/oauth.server";
import { failureWhen } from "#/features/ingest-history/api/providers/provider-failure";
import type {
  Authorization,
  Discovery,
  ProviderError,
} from "#/features/ingest-history/model/provider";

const VERIFIER_FIELD = "codeVerifier";
const CLIENT_NAME = "konomi";
const SCOPE_SEPARATOR = " ";

const ClientMetadata = Schema.Struct({
  client_name: Schema.String,
  redirect_uris: Schema.Array(Schema.String),
  grant_types: Schema.Array(Schema.String),
  response_types: Schema.Array(Schema.String),
  token_endpoint_auth_method: Schema.String,
  scope: Schema.String,
});

const RegisteredClient = Schema.Struct({ client_id: Schema.String });

const REJECTING_CODES: ReadonlySet<string> = new Set(["invalid_grant", "invalid_client"]);

const rejectedBySdk = (cause: unknown): boolean =>
  OAuthError.isInstance(cause) && REJECTING_CODES.has(cause.code);

const unavailable = (step: string): ((cause: unknown) => ProviderError) =>
  failureWhen(rejectedBySdk)({
    rejected: `${step} を断られた。許可し直す`,
    failed: `${step} に失敗した`,
  });

const sdkCall = <Out>(step: string, run: () => Promise<Out>): Effect.Effect<Out, ProviderError> =>
  Effect.tryPromise({ try: run, catch: unavailable(step) });

const registeredClientOf = (
  credential: Credential,
): Effect.Effect<Readonly<{ client_id: string }>, ProviderError> =>
  requireField(credential, OAUTH_FIELD.clientId).pipe(
    Effect.map((clientId) => ({ client_id: clientId })),
  );

const settled = (
  credential: Credential,
  tokens: Readonly<{ access_token: string; refresh_token?: string | undefined }>,
): Credential => withTokens(credential, tokens, [OAUTH_FIELD.state, VERIFIER_FIELD]);

const clientIdOf = ({
  discovery,
  credential,
  redirectUri,
  scope,
}: Readonly<{
  discovery: Discovery;
  credential: Credential;
  redirectUri: string;
  scope: string;
}>): Effect.Effect<string, ProviderError> =>
  pipe(
    fieldOf(credential, OAUTH_FIELD.clientId),
    Option.match({
      onSome: Effect.succeed,
      onNone: () =>
        postJson({
          url: discovery.registration,
          headers: {},
          payload: ClientMetadata,
          body: {
            client_name: CLIENT_NAME,
            redirect_uris: [redirectUri],
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            token_endpoint_auth_method: "none",
            scope,
          },
          schema: RegisteredClient,
        }).pipe(Effect.map(({ client_id: clientId }) => clientId)),
    }),
  );

export const startDiscovered = ({
  authorization,
  discovery,
  credential,
  redirectUri,
  state,
}: Readonly<{
  authorization: Authorization;
  discovery: Discovery;
  credential: Credential;
  redirectUri: string;
  state: string;
}>): Effect.Effect<Readonly<{ url: string; credential: Credential }>, ProviderError> =>
  Effect.gen(function* start() {
    const scope = Arr.join(authorization.scopes, SCOPE_SEPARATOR);
    const clientId = yield* clientIdOf({ discovery, credential, redirectUri, scope });
    const started = yield* sdkCall("許可の画面の用意", () =>
      startAuthorization(discovery.issuer, {
        clientInformation: { client_id: clientId },
        redirectUrl: redirectUri,
        scope,
        state,
        resource: discovery.resource,
      }),
    );
    return {
      url: started.authorizationUrl.toString(),
      credential: {
        method: credential.method,
        fields: {
          ...credential.fields,
          [OAUTH_FIELD.clientId]: clientId,
          [OAUTH_FIELD.state]: state,
          [VERIFIER_FIELD]: started.codeVerifier,
        },
      },
    };
  }).pipe(Effect.withSpan("oauth.discovered.start"));

type Tokens = Awaited<ReturnType<typeof exchangeAuthorization>>;

const grantedBy = ({
  credential,
  secretField,
  step,
  span,
  grant,
}: Readonly<{
  credential: Credential;
  secretField: string;
  step: string;
  span: string;
  grant: (
    given: Readonly<{ clientInformation: Readonly<{ client_id: string }>; secret: string }>,
  ) => Promise<Tokens>;
}>): Effect.Effect<Credential, ProviderError> =>
  Effect.gen(function* granted() {
    const clientInformation = yield* registeredClientOf(credential);
    const secret = yield* requireField(credential, secretField);
    const tokens = yield* sdkCall(step, () => grant({ clientInformation, secret }));
    return settled(credential, tokens);
  }).pipe(Effect.withSpan(span));

export const finishDiscovered = ({
  discovery,
  credential,
  code,
  redirectUri,
}: Readonly<{
  discovery: Discovery;
  credential: Credential;
  code: string;
  redirectUri: string;
}>): Effect.Effect<Credential, ProviderError> =>
  grantedBy({
    credential,
    secretField: VERIFIER_FIELD,
    step: "トークンの受け取り",
    span: "oauth.discovered.finish",
    grant: ({ clientInformation, secret }) =>
      exchangeAuthorization(discovery.issuer, {
        clientInformation,
        authorizationCode: code,
        codeVerifier: secret,
        redirectUri,
        resource: new URL(discovery.resource),
      }),
  });

export const refreshDiscovered =
  (discovery: Discovery) =>
  (credential: Credential): Effect.Effect<Credential, ProviderError> =>
    grantedBy({
      credential,
      secretField: OAUTH_FIELD.refreshToken,
      step: "トークンの更新",
      span: "oauth.discovered.refresh",
      grant: ({ clientInformation, secret }) =>
        refreshAuthorization(discovery.issuer, {
          clientInformation,
          refreshToken: secret,
          resource: new URL(discovery.resource),
        }),
    });
