import { Effect } from "effect";

import type { Credential } from "#/entities/connection";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { OAUTH_FIELD } from "#/features/ingest/api/providers/oauth.server";
import type { ProviderError } from "#/features/ingest/model/provider";

const headersOf = (credential: Credential): Effect.Effect<Headers, ProviderError> =>
  Effect.all({
    token: requireField(credential, OAUTH_FIELD.accessToken),
    clientId: requireField(credential, OAUTH_FIELD.clientId),
  }).pipe(
    Effect.map(({ token, clientId }) => ({
      Authorization: `Bearer ${token}`,
      "Client-Id": clientId,
    })),
  );

export { headersOf };
