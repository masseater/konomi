import { Effect, Function as Fn, Option, String as Str, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";

const BINARY = 2;

const fieldOf: {
  (name: string): (credential: Credential) => Option.Option<string>;
  (credential: Credential, name: string): Option.Option<string>;
} = Fn.dual(BINARY, (credential: Credential, name: string): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(credential.fields[name]),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
  ),
);

const requireField: {
  (name: string): (credential: Credential) => Effect.Effect<string, CredentialRejected>;
  (credential: Credential, name: string): Effect.Effect<string, CredentialRejected>;
} = Fn.dual(
  BINARY,
  (credential: Credential, name: string): Effect.Effect<string, CredentialRejected> =>
    pipe(
      fieldOf(credential, name),
      Effect.fromOption,
      Effect.mapError(() => CredentialRejected.make({ message: `${name} がまだ無い` })),
    ),
);

type UserClientFields = Readonly<{ user: string; clientId: string }>;

const userClientOf: {
  (
    fields: UserClientFields,
  ): (credential: Credential) => Effect.Effect<UserClientFields, CredentialRejected>;
  (
    credential: Credential,
    fields: UserClientFields,
  ): Effect.Effect<UserClientFields, CredentialRejected>;
} = Fn.dual(
  BINARY,
  (
    credential: Credential,
    fields: UserClientFields,
  ): Effect.Effect<UserClientFields, CredentialRejected> =>
    Effect.all(
      {
        user: requireField(credential, fields.user).pipe(Effect.map(encodeURIComponent)),
        clientId: requireField(credential, fields.clientId),
      },
      { concurrency: 1 },
    ),
);

export type { UserClientFields };
export { fieldOf, requireField, userClientOf };
