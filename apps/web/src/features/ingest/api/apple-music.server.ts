import { Effect } from "effect";

import { openCredential, replaceCredential } from "#/entities/connection/index.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { connectionOf } from "./connect.server";
import { FIELD } from "./providers/apple-music/api";
import { signDeveloperToken } from "./providers/apple-music/developer-token.server";

const PROVIDER = "apple-music";

const appleDeveloperToken: Effect.Effect<string, ProviderError> = connectionOf(PROVIDER).pipe(
  Effect.flatMap(openCredential),
  Effect.flatMap(signDeveloperToken),
);

const saveAppleUserToken = (token: string): Effect.Effect<void, ProviderError> =>
  connectionOf(PROVIDER).pipe(
    Effect.flatMap(openCredential),
    Effect.flatMap((credential) =>
      replaceCredential({
        provider: PROVIDER,
        credential: {
          method: credential.method,
          fields: { ...credential.fields, [FIELD.userToken]: token },
        },
      }),
    ),
    Effect.withSpan("apple-music.save-user-token"),
  );

export { appleDeveloperToken, saveAppleUserToken };
