import { Effect } from "effect";

import type { Credential } from "#/entities/connection";
import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { OAUTH_FIELD, bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

export const headersOf = (credential: Credential): Effect.Effect<Headers, ProviderError> =>
  Effect.zipWith(
    bearerHeadersOf(credential),
    requireField(credential, OAUTH_FIELD.clientId),
    (bearer, clientId) => ({ ...bearer, "Client-Id": clientId }),
  );
