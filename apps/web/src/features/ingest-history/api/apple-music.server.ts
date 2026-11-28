import { Effect } from "effect";

import { openCredential, replaceCredential } from "#/entities/connection/index.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { connectionOf } from "./connect.server.ts";
import { FIELD } from "./providers/apple-music/api.ts";
import { signDeveloperToken } from "./providers/apple-music/developer-token.server.ts";
import { withFields } from "./providers/credential-field.ts";

const PROVIDER = "apple-music";

export const appleDeveloperToken: Effect.Effect<string, ProviderError> = connectionOf(
  PROVIDER,
).pipe(Effect.flatMap(openCredential), Effect.flatMap(signDeveloperToken));

export const saveAppleUserToken = (token: string): Effect.Effect<void, ProviderError> =>
  connectionOf(PROVIDER).pipe(
    Effect.flatMap(openCredential),
    Effect.flatMap((credential) =>
      replaceCredential({
        provider: PROVIDER,
        credential: withFields(credential, { [FIELD.userToken]: token }),
      }),
    ),
    Effect.withSpan("apple-music.save-user-token"),
  );
