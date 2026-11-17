import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ProviderUnavailable extends taggedError<
  ProviderUnavailable,
  { readonly brand: unique symbol }
>()("ProviderUnavailable", { message: Schema.String }) {}
