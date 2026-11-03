import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Pin = Schema.Struct({
  id: Schema.String,
  title: OptionalText,
  description: OptionalText,
  link: OptionalText,
  created_at: OptionalText,
});

const Pins = Schema.Struct({ items: Schema.Array(Pin), bookmark: OptionalText });

type PinterestPin = typeof Pin.Type;

export type { PinterestPin };
export { Pins };
