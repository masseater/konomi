import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Tags = Schema.optional(Schema.NullOr(Schema.Array(Schema.String)));

const Raindrop = Schema.Struct({
  _id: Schema.Int,
  title: OptionalText,
  link: Schema.String,
  created: OptionalText,
  domain: OptionalText,
  tags: Tags,
});

const Raindrops = Schema.Struct({ items: Schema.Array(Raindrop) });

type RaindropItem = typeof Raindrop.Type;

export type { RaindropItem };
export { Raindrops };
