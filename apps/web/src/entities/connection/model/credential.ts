import { Schema } from "effect";

const CredentialSchema = Schema.Struct({
  method: Schema.NonEmptyString,
  fields: Schema.Record(Schema.String, Schema.String),
});

type Credential = typeof CredentialSchema.Type;

export type { Credential };
export { CredentialSchema };
