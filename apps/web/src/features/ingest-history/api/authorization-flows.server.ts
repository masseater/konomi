import { Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { replaceCredential } from "#/entities/connection/index.server";
import type {
  Authorization,
  Discovery,
  ProviderError,
} from "#/features/ingest-history/model/provider";
import type { ProviderId } from "#/shared/config";

import { requireField } from "./providers/credential-field";
import { finishDiscovered, startDiscovered } from "./providers/discovered-oauth.server";
import { OAUTH_FIELD, authorizeUrlOf, exchangeCode, newState } from "./providers/oauth.server";

export type Authorizing = Readonly<{ authorization: Authorization; credential: Credential }>;

type Started = Readonly<{ url: string; credential: Credential }>;

const startedWith = ({
  provider,
  begin,
}: Readonly<{
  provider: ProviderId;
  begin: (state: string) => Effect.Effect<Started, ProviderError>;
}>): Effect.Effect<string, ProviderError> =>
  Effect.gen(function* start() {
    const started = yield* begin(newState());
    yield* replaceCredential({ provider, credential: started.credential });
    return started.url;
  });

export const startByEndpoints = ({
  provider,
  authorization,
  credential,
  redirectUri,
}: Authorizing & Readonly<{ provider: ProviderId; redirectUri: string }>): Effect.Effect<
  string,
  ProviderError
> =>
  startedWith({
    provider,
    begin: (state) =>
      requireField(credential, OAUTH_FIELD.clientId).pipe(
        Effect.map((clientId): Started => ({
          url: authorizeUrlOf({ authorization, clientId, redirectUri, state }),
          credential: {
            method: credential.method,
            fields: { ...credential.fields, [OAUTH_FIELD.state]: state },
          },
        })),
      ),
  });

export const startByDiscovery = ({
  provider,
  authorization,
  credential,
  discovery,
  redirectUri,
}: Authorizing &
  Readonly<{ provider: ProviderId; redirectUri: string; discovery: Discovery }>): Effect.Effect<
  string,
  ProviderError
> =>
  startedWith({
    provider,
    begin: (state) => startDiscovered({ authorization, discovery, credential, redirectUri, state }),
  });

export const exchangeFor = ({
  authorization,
  credential,
  code,
  redirectUri,
}: Authorizing & Readonly<{ code: string; redirectUri: string }>): Effect.Effect<
  Credential,
  ProviderError
> =>
  pipe(
    Option.fromUndefinedOr(authorization.discovery),
    Option.match({
      onNone: () => exchangeCode({ authorization, credential, code, redirectUri }),
      onSome: (discovery) => finishDiscovered({ discovery, credential, code, redirectUri }),
    }),
  );
