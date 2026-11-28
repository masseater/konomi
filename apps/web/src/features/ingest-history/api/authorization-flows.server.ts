import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { replaceCredential } from "#/entities/connection/index.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";
import type { ProviderId } from "#/shared/config";

import { requireField, withFields } from "./providers/credential-field.ts";
import {
  authorizeDiscovered,
  clientIdOf,
  finishDiscovered,
} from "./providers/discovered-oauth.server.ts";
import {
  OAUTH_FIELD,
  SCOPE_SEPARATOR,
  authorizeUrlOf,
  exchangeCode,
  newState,
} from "./providers/oauth.server.ts";
import type { Authorizing, Exchanging, Redirecting } from "./providers/oauth.server.ts";

export type Starting = Authorizing & Redirecting & Readonly<{ provider: ProviderId }>;

type Given = Readonly<{ clientId: string; state: string }>;

type Started = Readonly<{ url: string; fields: Readonly<Record<string, string>> }>;

export const startFor = ({
  provider,
  authorization,
  credential,
  redirectUri,
}: Starting): Effect.Effect<string, ProviderError> =>
  Effect.gen(function* start() {
    const scope = Arr.join(authorization.scopes, SCOPE_SEPARATOR);
    const plan = pipe(
      Option.fromUndefinedOr(authorization.discovery),
      Option.match({
        onNone: () => ({
          clientId: requireField(credential, OAUTH_FIELD.clientId),
          authorize: ({ clientId, state }: Given): Effect.Effect<Started, ProviderError> =>
            Effect.succeed({
              url: authorizeUrlOf({ authorization, clientId, redirectUri, state }),
              fields: {},
            }),
        }),
        onSome: (discovery) => ({
          clientId: clientIdOf({ discovery, credential, redirectUri, scope }),
          authorize: ({ clientId, state }: Given): Effect.Effect<Started, ProviderError> =>
            authorizeDiscovered({ discovery, clientId, redirectUri, scope, state }),
        }),
      }),
    );
    const state = newState();
    const clientId = yield* plan.clientId;
    const started = yield* plan.authorize({ clientId, state });
    yield* replaceCredential({
      provider,
      credential: withFields(credential, {
        [OAUTH_FIELD.clientId]: clientId,
        [OAUTH_FIELD.state]: state,
        ...started.fields,
      }),
    });
    return started.url;
  });

export const exchangeFor = ({
  authorization,
  credential,
  code,
  redirectUri,
}: Authorizing & Exchanging): Effect.Effect<Credential, ProviderError> =>
  pipe(
    Option.fromUndefinedOr(authorization.discovery),
    Option.match({
      onNone: () => exchangeCode({ authorization, credential, code, redirectUri }),
      onSome: (discovery) => finishDiscovered({ discovery, credential, code, redirectUri }),
    }),
  );
