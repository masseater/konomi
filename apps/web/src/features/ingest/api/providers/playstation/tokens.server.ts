import { Clock, Effect, Option, Schema, pipe } from "effect";
import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
} from "psn-api";
import type { AuthTokensResponse } from "psn-api";

import type { Credential } from "#/entities/connection";
import { fieldOf, requireField } from "#/features/ingest/api/providers/credential-field";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError } from "#/features/ingest/model/provider";

import { FIELD } from "./api";

const MS_PER_SECOND = 1000;

const rejected = (message: string) => (): CredentialRejected =>
  CredentialRejected.make({ message });

const TokensSchema = Schema.Struct({
  accessToken: Schema.NonEmptyString,
  refreshToken: Schema.NonEmptyString,
  expiresIn: Schema.Finite,
});

type Tokens = typeof TokensSchema.Type;

const decodeTokens =
  (rejection: () => CredentialRejected) =>
  (
    tokens: Readonly<Pick<AuthTokensResponse, "accessToken" | "refreshToken" | "expiresIn">>,
  ): Effect.Effect<Tokens, CredentialRejected> =>
    Schema.decodeEffect(TokensSchema)(tokens).pipe(Effect.mapError(rejection));

const REFRESH_REJECTED = rejected("PlayStation の許可が切れた");

const NPSSO_REJECTED = rejected("NPSSO が切れている。ssocookie の画面から貼り直す");

const fromNpsso = (npsso: string): Effect.Effect<Tokens, ProviderError> =>
  Effect.tryPromise({
    try: () => exchangeNpssoForAccessCode(npsso),
    catch: NPSSO_REJECTED,
  }).pipe(
    Effect.flatMap((code) =>
      Effect.tryPromise({
        try: () => exchangeAccessCodeForAuthTokens(code),
        catch: NPSSO_REJECTED,
      }),
    ),
    Effect.withSpan("playstation.npsso"),
  );

const fromRefresh = (refreshToken: string): Effect.Effect<Tokens, ProviderError> =>
  Effect.tryPromise({
    try: () => exchangeRefreshTokenForAuthTokens(refreshToken),
    catch: REFRESH_REJECTED,
  }).pipe(Effect.flatMap(decodeTokens(REFRESH_REJECTED)), Effect.withSpan("playstation.refresh"));

const withTokens =
  (credential: Credential) =>
  (tokens: Tokens): Effect.Effect<Credential> =>
    Clock.currentTimeMillis.pipe(
      Effect.map((now) => ({
        method: credential.method,
        fields: {
          ...credential.fields,
          [FIELD.accessToken]: tokens.accessToken,
          [FIELD.refreshToken]: tokens.refreshToken,
          [FIELD.expiresAtMs]: String(now + tokens.expiresIn * MS_PER_SECOND),
        },
      })),
    );

const renewPlaystation = (credential: Credential): Effect.Effect<Credential, ProviderError> =>
  pipe(
    fieldOf(credential, FIELD.refreshToken),
    Option.match({
      onNone: () => requireField(credential, FIELD.npsso).pipe(Effect.flatMap(fromNpsso)),
      onSome: (refreshToken) =>
        fromRefresh(refreshToken).pipe(
          Effect.catchTag("CredentialRejected", () =>
            requireField(credential, FIELD.npsso).pipe(Effect.flatMap(fromNpsso)),
          ),
        ),
    }),
    Effect.flatMap(withTokens(credential)),
  );

const accessTokenOf = (credential: Credential): Effect.Effect<string, ProviderError> =>
  Effect.gen(function* access() {
    const now = yield* Clock.currentTimeMillis;
    const fresh = pipe(
      fieldOf(credential, FIELD.expiresAtMs),
      Option.map(Number),
      Option.exists((expiresAtMs) => expiresAtMs > now),
    );
    if (!fresh) {
      return yield* rejected("PlayStation のアクセストークンを取り直す")();
    }
    return yield* requireField(credential, FIELD.accessToken);
  });

export { accessTokenOf, renewPlaystation };
