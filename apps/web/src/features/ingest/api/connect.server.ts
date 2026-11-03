import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Connection } from "#/entities/connection";
import {
  listConnections,
  openCredential,
  replaceCredential,
} from "#/entities/connection/index.server";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";
import { SITE_ORIGIN } from "#/shared/config/index.server";

import { exchangeFor, startByDiscovery, startByEndpoints } from "./authorization-flows.server";
import type { Authorizing } from "./authorization-flows.server";
import { PROVIDERS } from "./providers/index.server";
import { stateMatches } from "./providers/oauth.server";

const HOME = "/";

const redirectUriOf = (provider: ProviderId): string =>
  `${SITE_ORIGIN}/api/connections/${provider}/callback`;

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
  authorizingOf(provider).pipe(
    Effect.flatMap((authorizing) =>
      pipe(
        Option.fromUndefinedOr(authorizing.authorization.discovery),
        Option.match({
          onNone: () =>
            startByEndpoints({ provider, redirectUri: redirectUriOf(provider), ...authorizing }),
          onSome: (discovery) =>
            startByDiscovery({
              provider,
              redirectUri: redirectUriOf(provider),
              discovery,
              ...authorizing,
            }),
        }),
      ),
    ),
    Effect.withSpan("connect.start", { attributes: { provider } }),
  );

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
    const redirectUri = redirectUriOf(provider);
    const authorized = yield* exchangeFor({ authorization, credential, code, redirectUri });
    yield* replaceCredential({ provider, credential: authorized });
    return HOME;
  }).pipe(Effect.withSpan("connect.finish", { attributes: { provider } }));

export { connectionOf, finishAuthorization, redirectUriOf, startAuthorization };
