import {
  Array as Arr,
  Effect,
  Function as Fn,
  Match,
  Option,
  Record as Rec,
  Schema,
  pipe,
} from "effect";
import { Base64, Hex } from "effect/encoding";

import type { Credential } from "#/entities/connection";
import type { Authorization, ProviderError } from "#/features/ingest/model/provider";

import { fieldOf, requireField } from "./credential-field";
import { postForm } from "./http.server";

const OAUTH_FIELD = {
  clientId: "clientId",
  clientSecret: "clientSecret",
  refreshToken: "refreshToken",
  accessToken: "accessToken",
  state: "oauthState",
} as const;

const CLIENT_FIELDS = [
  { name: OAUTH_FIELD.clientId, label: "Client ID", secret: false, optional: false },
  { name: OAUTH_FIELD.clientSecret, label: "Client Secret", secret: true, optional: false },
] as const;

const STATE_BYTES = 16;
const BINARY = 2;
const SCOPE_SEPARATOR = " ";

const TokenResponse = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.optional(Schema.String),
});

const basicAuthOf = (credential: Credential): Effect.Effect<string, ProviderError> =>
  Effect.all([
    requireField(credential, OAUTH_FIELD.clientId),
    requireField(credential, OAUTH_FIELD.clientSecret),
  ]).pipe(Effect.map(([id, secret]) => `Basic ${Base64.encode(`${id}:${secret}`)}`));

const withTokens = (credential: Credential, tokens: typeof TokenResponse.Type): Credential => ({
  method: credential.method,
  fields: {
    ...Rec.remove(credential.fields, OAUTH_FIELD.state),
    [OAUTH_FIELD.accessToken]: tokens.access_token,
    ...pipe(
      Option.fromUndefinedOr(tokens.refresh_token),
      Option.map((refreshToken) => ({ [OAUTH_FIELD.refreshToken]: refreshToken })),
      Option.getOrElse(() => ({})),
    ),
  },
});

type TokenRequest = Readonly<{
  headers: Readonly<Record<string, string>>;
  fields: Readonly<Record<string, string>>;
}>;

const clientAuthOf = (
  authorization: Authorization,
  credential: Credential,
): Effect.Effect<TokenRequest, ProviderError> =>
  Match.value(authorization.clientAuthentication).pipe(
    Match.when("body", () =>
      Effect.all({
        client_id: requireField(credential, OAUTH_FIELD.clientId),
        client_secret: requireField(credential, OAUTH_FIELD.clientSecret),
      }).pipe(Effect.map((fields): TokenRequest => ({ headers: {}, fields }))),
    ),
    Match.orElse(() =>
      basicAuthOf(credential).pipe(
        Effect.map((basic): TokenRequest => ({ headers: { Authorization: basic }, fields: {} })),
      ),
    ),
  );

const requestTokens = (
  authorization: Authorization,
  credential: Credential,
  fields: Readonly<Record<string, string>>,
): Effect.Effect<Credential, ProviderError> =>
  clientAuthOf(authorization, credential).pipe(
    Effect.flatMap((client) =>
      postForm({
        url: authorization.tokenUrl,
        headers: client.headers,
        fields: { ...fields, ...client.fields },
        schema: TokenResponse,
      }),
    ),
    Effect.map((tokens) => withTokens(credential, tokens)),
  );

const refreshAccess =
  (authorization: Authorization) =>
  (credential: Credential): Effect.Effect<Credential, ProviderError> =>
    requireField(credential, OAUTH_FIELD.refreshToken).pipe(
      Effect.flatMap((refreshToken) =>
        requestTokens(authorization, credential, {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      ),
      Effect.withSpan("oauth.refresh"),
    );

const exchangeCode = ({
  authorization,
  credential,
  code,
  redirectUri,
}: Readonly<{
  authorization: Authorization;
  credential: Credential;
  code: string;
  redirectUri: string;
}>): Effect.Effect<Credential, ProviderError> =>
  requestTokens(authorization, credential, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  }).pipe(Effect.withSpan("oauth.exchange"));

const newState = (): string => Hex.encode(crypto.getRandomValues(new Uint8Array(STATE_BYTES)));

const authorizeUrlOf = ({
  authorization,
  clientId,
  redirectUri,
  state,
}: Readonly<{
  authorization: Authorization;
  clientId: string;
  redirectUri: string;
  state: string;
}>): string => {
  const url = new URL(authorization.authorizeUrl);
  const params = {
    ...authorization.params,
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: Arr.join(authorization.scopes, SCOPE_SEPARATOR),
    state,
  };
  for (const [name, value] of Rec.toEntries(params)) {
    url.searchParams.set(name, value);
  }
  return url.toString();
};

const bearerHeadersOf = (
  credential: Credential,
): Effect.Effect<Readonly<Record<string, string>>, ProviderError> =>
  requireField(credential, OAUTH_FIELD.accessToken).pipe(
    Effect.map((token) => ({ Authorization: `Bearer ${token}` })),
  );

const stateMatches: {
  (state: string): (credential: Credential) => boolean;
  (credential: Credential, state: string): boolean;
} = Fn.dual(BINARY, (credential: Credential, state: string): boolean =>
  Option.exists(fieldOf(credential, OAUTH_FIELD.state), (expected) => expected === state),
);

export {
  CLIENT_FIELDS,
  OAUTH_FIELD,
  authorizeUrlOf,
  bearerHeadersOf,
  exchangeCode,
  newState,
  refreshAccess,
  stateMatches,
};
