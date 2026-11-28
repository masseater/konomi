import { Array as Arr, Effect, Function as Fn, Match, Option, Schema, pipe } from "effect";
import { Base64, Hex } from "effect/encoding";

import type { Credential } from "#/entities/connection";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";
import type { CredentialRejected } from "#/features/ingest-history/model/credential-rejected";
import type { Authorization, ProviderError } from "#/features/ingest-history/model/provider";

import {
  bearerFieldOf,
  fieldOf,
  requireFields,
  withFields,
  withoutFields,
} from "./credential-field.ts";
import { fetchJson } from "./http.server.ts";

export const OAUTH_FIELD = {
  clientId: "clientId",
  clientSecret: "clientSecret",
  refreshToken: "refreshToken",
  accessToken: "accessToken",
  state: "oauthState",
} as const;

export const CLIENT_FIELDS = [
  { name: OAUTH_FIELD.clientId, label: "Client ID", secret: false, optional: false },
  { name: OAUTH_FIELD.clientSecret, label: "Client Secret", secret: true, optional: false },
] as const;

const STATE_BYTES = 16;
const BINARY = 2;
export const SCOPE_SEPARATOR = " ";

const TokenResponse = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.optional(Schema.String),
});

const clientOf = (
  credential: Credential,
): Effect.Effect<Record<"client_id" | "client_secret", string>, CredentialRejected> =>
  requireFields(credential, {
    client_id: OAUTH_FIELD.clientId,
    client_secret: OAUTH_FIELD.clientSecret,
  });

const THREE = 3;

export type Tokens = Readonly<{ access_token: string; refresh_token?: string | undefined }>;

const tokenFieldsOf = ({
  access_token: accessToken,
  refresh_token: refreshToken,
}: Tokens): Record<string, string> => ({
  [OAUTH_FIELD.accessToken]: accessToken,
  ...pipe(
    Option.fromUndefinedOr(refreshToken),
    Option.map((token) => ({ [OAUTH_FIELD.refreshToken]: token })),
    Option.getOrElse(() => ({})),
  ),
});

export const withTokens: {
  (tokens: Tokens, transient: readonly string[]): (credential: Credential) => Credential;
  (credential: Credential, tokens: Tokens, transient: readonly string[]): Credential;
} = Fn.dual(
  THREE,
  (credential: Credential, tokens: Tokens, transient: readonly string[]): Credential =>
    pipe(credential, withoutFields(transient), withFields(tokenFieldsOf(tokens))),
);

export type Authorizing = Readonly<{ authorization: Authorization; credential: Credential }>;

export type Redirecting = Readonly<{ credential: Credential; redirectUri: string }>;

export type Grant =
  | Readonly<{ kind: "refresh" }>
  | Readonly<{ kind: "code"; code: string; redirectUri: string }>;

export const formTokens =
  (authorization: Authorization) =>
  (credential: Credential, grant: Grant, secret: string): Effect.Effect<Tokens, ProviderError> =>
    clientOf(credential).pipe(
      Effect.map(({ client_id, client_secret }) =>
        Match.value(authorization.clientAuthentication).pipe(
          Match.when("body", () => ({ headers: {}, fields: { client_id, client_secret } })),
          Match.orElse(() => ({
            headers: { Authorization: `Basic ${Base64.encode(`${client_id}:${client_secret}`)}` },
            fields: {},
          })),
        ),
      ),
      Effect.flatMap((client) =>
        fetchJson({
          url: authorization.tokenUrl,
          headers: client.headers,
          schema: TokenResponse,
          post: {
            form: {
              ...Match.value(grant).pipe(
                Match.when({ kind: "refresh" }, () => ({
                  grant_type: "refresh_token",
                  refresh_token: secret,
                })),
                Match.orElse(({ redirectUri }) => ({
                  grant_type: "authorization_code",
                  code: secret,
                  redirect_uri: redirectUri,
                })),
              ),
              ...client.fields,
            },
          },
        }),
      ),
    );

export const newState = (): string =>
  Hex.encode(crypto.getRandomValues(new Uint8Array(STATE_BYTES)));

export const authorizeUrlOf = ({
  authorization,
  clientId,
  redirectUri,
  state,
}: Readonly<{
  authorization: Authorization;
  clientId: string;
  redirectUri: string;
  state: string;
}>): string =>
  urlWith(authorization.authorizeUrl, {
    ...authorization.params,
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: Arr.join(authorization.scopes, SCOPE_SEPARATOR),
    state,
  });

export const bearerHeadersOf = bearerFieldOf(OAUTH_FIELD.accessToken);

export const stateMatches: {
  (state: string): (credential: Credential) => boolean;
  (credential: Credential, state: string): boolean;
} = Fn.dual(BINARY, (credential: Credential, state: string): boolean =>
  Option.exists(fieldOf(credential, OAUTH_FIELD.state), (expected) => expected === state),
);
