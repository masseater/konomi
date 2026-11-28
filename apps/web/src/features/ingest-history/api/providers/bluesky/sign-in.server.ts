import { Effect } from "effect";

import type { Credential } from "#/entities/connection";
import { requireFields } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { FIELD, SERVICE } from "./api.ts";
import { Login, Session } from "./schemas.ts";

export const signIn = (credential: Credential): Effect.Effect<typeof Session.Type, ProviderError> =>
  requireFields(credential, { identifier: FIELD.identifier, password: FIELD.appPassword }).pipe(
    Effect.flatMap((body) =>
      fetchJson({
        url: `${SERVICE}/com.atproto.server.createSession`,
        headers: {},
        schema: Session,
        post: { payload: Login, value: body },
      }),
    ),
  );
