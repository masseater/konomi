import { Effect } from "effect";

import type { Credential } from "#/entities/connection";
import { requireFields } from "#/features/ingest-history/api/providers/credential-field";
import { postJson } from "#/features/ingest-history/api/providers/http.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { FIELD, SERVICE } from "./api";
import { Login, Session } from "./schemas";

export const signIn = (credential: Credential): Effect.Effect<typeof Session.Type, ProviderError> =>
  requireFields(credential, { identifier: FIELD.identifier, password: FIELD.appPassword }).pipe(
    Effect.flatMap((body) =>
      postJson({
        url: `${SERVICE}/com.atproto.server.createSession`,
        headers: {},
        payload: Login,
        body,
        schema: Session,
      }),
    ),
  );
