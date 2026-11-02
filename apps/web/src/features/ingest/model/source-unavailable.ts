import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class SourceUnavailable extends taggedError<SourceUnavailable, { readonly brand: unique symbol }>()(
  "SourceUnavailable",
  { message: Schema.String },
) {}

export { SourceUnavailable };
