import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class ProviderUnavailable extends taggedError<
  ProviderUnavailable,
  { readonly brand: unique symbol }
>()("ProviderUnavailable", { message: Schema.String }) {}

export { ProviderUnavailable };
