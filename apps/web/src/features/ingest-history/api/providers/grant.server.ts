import { Array as Arr, Effect, Match, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { replaceCredential } from "#/entities/connection/index.server";
import { requireField, withFields } from "#/features/ingest-history/api/providers/credential-field";
import {
  VERIFIER_FIELD,
  authorizeDiscovered,
  clientIdOf,
  sdkTokens,
} from "#/features/ingest-history/api/providers/discovered-oauth.server";
import {
  OAUTH_FIELD,
  SCOPE_SEPARATOR,
  authorizeUrlOf,
  formTokens,
  newState,
  withTokens,
} from "#/features/ingest-history/api/providers/oauth.server";
import type {
  Authorizing,
  Grant,
  Redirecting,
} from "#/features/ingest-history/api/providers/oauth.server";
import type { Authorization, ProviderError } from "#/features/ingest-history/model/provider";
import type { ProviderId } from "#/shared/config";

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

export const grantFor =
  ({ authorization, grant }: Readonly<{ authorization: Authorization; grant: Grant }>) =>
  (credential: Credential): Effect.Effect<Credential, ProviderError> => {
    const discovery = Option.fromUndefinedOr(authorization.discovery);
    const secret = Match.value(grant).pipe(
      Match.when({ kind: "refresh" }, () => requireField(credential, OAUTH_FIELD.refreshToken)),
      Match.orElse(({ code }) =>
        Option.match(discovery, {
          onNone: () => Effect.succeed(code),
          onSome: () => requireField(credential, VERIFIER_FIELD),
        }),
      ),
    );
    const request = Option.match(discovery, {
      onNone: () => formTokens(authorization),
      onSome: sdkTokens,
    });
    const transient = Option.match(discovery, {
      onNone: () => [OAUTH_FIELD.state],
      onSome: () => [OAUTH_FIELD.state, VERIFIER_FIELD],
    });
    return secret.pipe(
      Effect.flatMap((value) => request(credential, grant, value)),
      Effect.map((tokens) => withTokens(credential, tokens, transient)),
      Effect.withSpan(`oauth.${grant.kind}`),
    );
  };
