import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class CredentialRejected extends taggedError<
  CredentialRejected,
  { readonly brand: unique symbol }
>()("CredentialRejected", { message: Schema.String }) {}

export { CredentialRejected };
