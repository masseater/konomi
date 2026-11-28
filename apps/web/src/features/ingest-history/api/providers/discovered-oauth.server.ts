import {
  OAuthError,
  exchangeAuthorization,
  refreshAuthorization,
  startAuthorization,
} from "@modelcontextprotocol/client";
import { Effect, Option, Schema, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { fieldOf, requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { OAUTH_FIELD, grantedBy } from "#/features/ingest-history/api/providers/oauth.server";
import type { Exchanging, Tokens } from "#/features/ingest-history/api/providers/oauth.server";
import { failureWhen } from "#/features/ingest-history/api/providers/provider-failure";
import type { Discovery, ProviderError } from "#/features/ingest-history/model/provider";

const VERIFIER_FIELD = "codeVerifier";
const CLIENT_NAME = "konomi";

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

export const clientIdOf = ({
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
        fetchJson({
          url: discovery.registration,
          headers: {},
          schema: RegisteredClient,
          post: {
            payload: ClientMetadata,
            value: {
              client_name: CLIENT_NAME,
              redirect_uris: [redirectUri],
              grant_types: ["authorization_code", "refresh_token"],
              response_types: ["code"],
              token_endpoint_auth_method: "none",
              scope,
            },
          },
        }).pipe(Effect.map(({ client_id: clientId }) => clientId)),
    }),
  );

export const authorizeDiscovered = ({
  discovery,
  clientId,
  redirectUri,
  scope,
  state,
}: Readonly<{
  discovery: Discovery;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
}>): Effect.Effect<
  Readonly<{ url: string; fields: Readonly<Record<string, string>> }>,
  ProviderError
> =>
  sdkCall("許可の画面の用意", () =>
    startAuthorization(discovery.issuer, {
      clientInformation: { client_id: clientId },
      redirectUrl: redirectUri,
      scope,
      state,
      resource: discovery.resource,
    }),
  ).pipe(
    Effect.map((started) => ({
      url: started.authorizationUrl.toString(),
      fields: { [VERIFIER_FIELD]: started.codeVerifier },
    })),
    Effect.withSpan("oauth.discovered.start"),
  );

const viaSdk = (
  credential: Credential,
  step: string,
  grant: (clientInformation: Readonly<{ client_id: string }>) => Promise<Tokens>,
): Effect.Effect<Tokens, ProviderError> =>
  requireField(credential, OAUTH_FIELD.clientId).pipe(
    Effect.flatMap((clientId) => sdkCall(step, () => grant({ client_id: clientId }))),
  );

export const finishDiscovered = ({
  discovery,
  credential,
  code,
  redirectUri,
}: Exchanging & Readonly<{ discovery: Discovery }>): Effect.Effect<Credential, ProviderError> =>
  grantedBy({
    credential,
    secret: requireField(credential, VERIFIER_FIELD),
    request: (codeVerifier) =>
      viaSdk(credential, "トークンの受け取り", (clientInformation) =>
        exchangeAuthorization(discovery.issuer, {
          clientInformation,
          authorizationCode: code,
          codeVerifier,
          redirectUri,
          resource: new URL(discovery.resource),
        }),
      ),
    transient: [OAUTH_FIELD.state, VERIFIER_FIELD],
    span: "oauth.discovered.finish",
  });

export const refreshDiscovered =
  (discovery: Discovery) =>
  (credential: Credential): Effect.Effect<Credential, ProviderError> =>
    grantedBy({
      credential,
      secret: requireField(credential, OAUTH_FIELD.refreshToken),
      request: (refreshToken) =>
        viaSdk(credential, "トークンの更新", (clientInformation) =>
          refreshAuthorization(discovery.issuer, {
            clientInformation,
            refreshToken,
            resource: new URL(discovery.resource),
          }),
        ),
      transient: [OAUTH_FIELD.state, VERIFIER_FIELD],
      span: "oauth.discovered.refresh",
    });
