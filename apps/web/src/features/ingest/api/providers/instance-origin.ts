import { Effect, Option, String as Str, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";

const SCHEME = "://";

const withScheme = (text: string): string =>
  pipe(
    Option.liftPredicate(text, Str.includes(SCHEME)),
    Option.getOrElse(() => `https${SCHEME}${text}`),
  );

const instanceOriginOf =
  (name: string) =>
  (credential: Credential): Effect.Effect<string, CredentialRejected> =>
    requireField(credential, name).pipe(
      Effect.flatMap((text) =>
        Effect.try({
          try: () => new URL(withScheme(text)).origin,
          catch: () => CredentialRejected.make({ message: `${name} が URL として読めない` }),
        }),
      ),
    );

export { instanceOriginOf };
