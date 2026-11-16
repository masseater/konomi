import { Schema } from "effect";

const Tag = Schema.Struct({ name: Schema.String });

const Author = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.NullOr(Schema.String)),
});

const Item = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  url: Schema.String,
  created_at: Schema.String,
  tags: Schema.Array(Tag),
  user: Author,
});

const Items = Schema.Array(Item);

type QiitaItem = typeof Item.Type;

export type { QiitaItem };
export { Items };
