import { Schema } from "effect";

const taggedError = Schema.TaggedError;

class ImportRejected extends taggedError<ImportRejected, { readonly brand: unique symbol }>()(
  "ImportRejected",
  { message: Schema.String },
) {}

export { ImportRejected };
