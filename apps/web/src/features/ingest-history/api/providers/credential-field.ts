import {
  Array as Arr,
  Effect,
  Function as Fn,
  Option,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import type { Credential } from "#/entities/connection";
import { CredentialRejected } from "#/features/ingest-history/model/credential-rejected";

const BINARY = 2;

export const fieldOf: {
  (name: string): (credential: Credential) => Option.Option<string>;
  (credential: Credential, name: string): Option.Option<string>;
} = Fn.dual(BINARY, (credential: Credential, name: string): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(credential.fields[name]),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
  ),
);

export const requireField: {
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

export const requireFields: {
  <Key extends string>(
    names: Readonly<Record<Key, string>>,
  ): (credential: Credential) => Effect.Effect<Record<Key, string>, CredentialRejected>;
  <Key extends string>(
    credential: Credential,
    names: Readonly<Record<Key, string>>,
  ): Effect.Effect<Record<Key, string>, CredentialRejected>;
} = Fn.dual(
  BINARY,
  (
    credential: Credential,
    names: Readonly<Record<string, string>>,
  ): Effect.Effect<Record<string, string>, CredentialRejected> =>
    Effect.forEach(
      Rec.toEntries(names),
      ([key, name]) =>
        requireField(credential, name).pipe(Effect.map((value) => [key, value] as const)),
      { concurrency: 1 },
    ).pipe(Effect.map(Rec.fromEntries)),
);

export type UserClientFields = Readonly<{ user: string; clientId: string }>;

export const userClientOf: {
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
    requireFields(credential, fields).pipe(
      Effect.map(({ user, clientId }) => ({ user: encodeURIComponent(user), clientId })),
    ),
);

export type Fields = Readonly<Record<string, string>>;

export const withFields: {
  (fields: Fields): (credential: Credential) => Credential;
  (credential: Credential, fields: Fields): Credential;
} = Fn.dual(BINARY, (credential: Credential, fields: Fields): Credential => ({
  method: credential.method,
  fields: { ...credential.fields, ...fields },
}));

export const withoutFields: {
  (names: readonly string[]): (credential: Credential) => Credential;
  (credential: Credential, names: readonly string[]): Credential;
} = Fn.dual(BINARY, (credential: Credential, names: readonly string[]): Credential => ({
  method: credential.method,
  fields: Arr.reduce(names, credential.fields, (fields, name) => Rec.remove(fields, name)),
}));

export const bearerOf = (token: string): Fields => ({ Authorization: `Bearer ${token}` });

export const optionalBearerOf = (token: Option.Option<string>): Fields =>
  Option.match(token, { onNone: () => ({}), onSome: bearerOf });

export const bearerFieldOf =
  (name: string) =>
  (credential: Credential): Effect.Effect<Fields, CredentialRejected> =>
    requireField(credential, name).pipe(Effect.map(bearerOf));

export const renewedField =
  <Failure>({
    field,
    span,
    create,
  }: Readonly<{
    field: string;
    span: string;
    create: (credential: Credential) => Effect.Effect<string, Failure>;
  }>) =>
  (credential: Credential): Effect.Effect<Credential, Failure> =>
    create(credential).pipe(
      Effect.map((value) => withFields(credential, { [field]: value })),
      Effect.withSpan(span),
    );
