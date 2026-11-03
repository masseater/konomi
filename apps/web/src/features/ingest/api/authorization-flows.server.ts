import { Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { replaceCredential } from "#/entities/connection/index.server";
import type { Authorization, Discovery, ProviderError } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

import { requireField } from "./providers/credential-field";
import { finishDiscovered, startDiscovered } from "./providers/discovered-oauth.server";
import { OAUTH_FIELD, authorizeUrlOf, exchangeCode, newState } from "./providers/oauth.server";

type Authorizing = Readonly<{ authorization: Authorization; credential: Credential }>;

const startByEndpoints = ({
  provider,
  authorization,
  credential,
  redirectUri,
}: Authorizing & Readonly<{ provider: ProviderId; redirectUri: string }>): Effect.Effect<
  string,
  ProviderError
> =>
  Effect.gen(function* start() {
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
      redirectUri,
      state,
    });
  });

const startByDiscovery = ({
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
  Effect.gen(function* start() {
    const started = yield* startDiscovered({
      authorization,
      discovery,
      credential,
      redirectUri,
      state: newState(),
    });
    yield* replaceCredential({ provider, credential: started.credential });
    return started.url;
  });

const exchangeFor = ({
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

export type { Authorizing };
export { exchangeFor, startByDiscovery, startByEndpoints };
