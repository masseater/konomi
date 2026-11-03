import {
  OAuthError,
  exchangeAuthorization,
  refreshAuthorization,
  startAuthorization,
} from "@modelcontextprotocol/client";
import type { OAuthTokens } from "@modelcontextprotocol/client";
import { Array as Arr, Effect, Match, Option, Record as Rec, Schema, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { fieldOf, requireField } from "#/features/ingest/api/providers/credential-field";
import { postJson } from "#/features/ingest/api/providers/http.server";
import { OAUTH_FIELD } from "#/features/ingest/api/providers/oauth.server";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { Authorization, Discovery, ProviderError } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

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

const unavailable =
  (step: string) =>
  (cause: unknown): ProviderError =>
    Match.value(cause).pipe(
      Match.when(
        (error: unknown) => OAuthError.isInstance(error) && REJECTING_CODES.has(error.code),
        () => CredentialRejected.make({ message: `${step} を断られた。許可し直す` }),
      ),
      Match.orElse(() =>
        ProviderUnavailable.make({ message: `${step} に失敗した: ${String(cause)}` }),
      ),
    );

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

const startDiscovered = ({
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
    const started = yield* Effect.tryPromise({
      try: () =>
        startAuthorization(discovery.issuer, {
          clientInformation: { client_id: clientId },
          redirectUrl: redirectUri,
          scope,
          state,
          resource: discovery.resource,
        }),
      catch: unavailable("許可の画面の用意"),
    });
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

const withTokens = (credential: Credential, tokens: OAuthTokens): Credential => ({
  method: credential.method,
  fields: {
    ...pipe(credential.fields, Rec.remove(OAUTH_FIELD.state), Rec.remove(VERIFIER_FIELD)),
    [OAUTH_FIELD.accessToken]: tokens.access_token,
    ...pipe(
      Option.fromUndefinedOr(tokens.refresh_token),
      Option.orElse(() => fieldOf(credential, OAUTH_FIELD.refreshToken)),
      Option.map((refreshToken) => ({ [OAUTH_FIELD.refreshToken]: refreshToken })),
      Option.getOrElse(() => ({})),
    ),
  },
});

const finishDiscovered = ({
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
  Effect.gen(function* finish() {
    const clientId = yield* requireField(credential, OAUTH_FIELD.clientId);
    const codeVerifier = yield* requireField(credential, VERIFIER_FIELD);
    const tokens = yield* Effect.tryPromise({
      try: () =>
        exchangeAuthorization(discovery.issuer, {
          clientInformation: { client_id: clientId },
          authorizationCode: code,
          codeVerifier,
          redirectUri,
          resource: new URL(discovery.resource),
        }),
      catch: unavailable("トークンの受け取り"),
    });
    return withTokens(credential, tokens);
  }).pipe(Effect.withSpan("oauth.discovered.finish"));

const refreshDiscovered =
  (discovery: Discovery) =>
  (credential: Credential): Effect.Effect<Credential, ProviderError> =>
    Effect.gen(function* refresh() {
      const clientId = yield* requireField(credential, OAUTH_FIELD.clientId);
      const refreshToken = yield* requireField(credential, OAUTH_FIELD.refreshToken);
      const tokens = yield* Effect.tryPromise({
        try: () =>
          refreshAuthorization(discovery.issuer, {
            clientInformation: { client_id: clientId },
            refreshToken,
            resource: new URL(discovery.resource),
          }),
        catch: unavailable("トークンの更新"),
      });
      return withTokens(credential, tokens);
    }).pipe(Effect.withSpan("oauth.discovered.refresh"));

export { finishDiscovered, refreshDiscovered, startDiscovered };
