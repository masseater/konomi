import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ToolError extends taggedError<ToolError, { readonly brand: unique symbol }>()(
  "ToolError",
  {
    message: Schema.String,
  },
) {}
