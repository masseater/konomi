import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Connection, Credential } from "#/entities/connection";
import {
  listConnections,
  openCredential,
  replaceCredential,
} from "#/entities/connection/index.server";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { Authorization, ProviderError } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";
import { SITE_ORIGIN } from "#/shared/config/index.server";

import { requireField } from "./providers/credential-field";
import { PROVIDERS } from "./providers/index.server";
import {
  OAUTH_FIELD,
  authorizeUrlOf,
  exchangeCode,
  newState,
  stateMatches,
} from "./providers/oauth.server";

const HOME = "/";

const redirectUriOf = (provider: ProviderId): string =>
  `${SITE_ORIGIN}/api/connections/${provider}/callback`;

type Authorizing = Readonly<{ authorization: Authorization; credential: Credential }>;

const rejected = (message: string): CredentialRejected => CredentialRejected.make({ message });

const connectionOf = (provider: ProviderId): Effect.Effect<Connection, CredentialRejected> =>
  listConnections.pipe(
    Effect.map(Arr.findFirst((found) => found.provider === provider)),
    Effect.flatMap(Effect.fromOption),
    Effect.mapError(() => rejected("先に Client ID と Client Secret を保存する")),
  );

const authorizingOf = (provider: ProviderId): Effect.Effect<Authorizing, CredentialRejected> =>
  connectionOf(provider).pipe(
    Effect.flatMap((found) =>
      openCredential(found).pipe(
        Effect.flatMap((credential) =>
          pipe(
            PROVIDERS[provider].methods,
            Arr.findFirst(({ id }) => id === credential.method),
            Option.flatMap(({ authorization }) => Option.fromUndefinedOr(authorization)),
            Option.map((authorization) => ({ authorization, credential })),
            Effect.fromOption,
            Effect.mapError(() => rejected("この方法は許可の画面を使わない")),
          ),
        ),
      ),
    ),
  );

const startAuthorization = (provider: ProviderId): Effect.Effect<string, ProviderError> =>
  Effect.gen(function* start() {
    const { authorization, credential } = yield* authorizingOf(provider);
    const clientId = yield* requireField(credential, OAUTH_FIELD.clientId);
    const state = newState();
    yield* replaceCredential({
      provider,
      credential: {
        method: credential.method,
        fields: { ...credential.fields, [OAUTH_FIELD.state]: state },
      },
    });
    return authorizeUrlOf({
      authorization,
      clientId,
      redirectUri: redirectUriOf(provider),
      state,
    });
  }).pipe(Effect.withSpan("connect.start", { attributes: { provider } }));

const finishAuthorization = ({
  provider,
  code,
  state,
}: Readonly<{ provider: ProviderId; code: string; state: string }>): Effect.Effect<
  string,
  ProviderError
> =>
  Effect.gen(function* finish() {
    const { authorization, credential } = yield* authorizingOf(provider);
    if (!stateMatches(credential, state)) {
      return yield* rejected("許可の画面から戻った値が合わない。やり直す");
    }
    const authorized = yield* exchangeCode({
      authorization,
      credential,
      code,
      redirectUri: redirectUriOf(provider),
    });
    yield* replaceCredential({ provider, credential: authorized });
    return HOME;
  }).pipe(Effect.withSpan("connect.finish", { attributes: { provider } }));

export { finishAuthorization, redirectUriOf, startAuthorization };
