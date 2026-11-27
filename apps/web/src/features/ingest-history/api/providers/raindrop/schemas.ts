import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const Tags = Schema.String.pipe(Schema.Array, Schema.NullOr, Schema.optional);

const Raindrop = Schema.Struct({
  _id: Schema.Int,
  title: OptionalText,
  link: Schema.String,
  created: OptionalText,
  domain: OptionalText,
  tags: Tags,
});

export const Raindrops = Schema.Struct({ items: Schema.Array(Raindrop) });

export type RaindropItem = typeof Raindrop.Type;
