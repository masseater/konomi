import { Schema } from "effect";

export const CredentialSchema = Schema.Struct({
  method: Schema.NonEmptyString,
  fields: Schema.Record(Schema.String, Schema.String),
});

export type Credential = typeof CredentialSchema.Type;
