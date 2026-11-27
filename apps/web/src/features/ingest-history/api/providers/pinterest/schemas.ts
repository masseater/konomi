import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const Pin = Schema.Struct({
  id: Schema.String,
  title: OptionalText,
  description: OptionalText,
  link: OptionalText,
  created_at: OptionalText,
});

export const Pins = Schema.Struct({ items: Schema.Array(Pin), bookmark: OptionalText });

export type PinterestPin = typeof Pin.Type;
