import { Schema } from "effect";

const Tags = Schema.String.pipe(Schema.Array, Schema.optional);

const Work = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  authorId: Schema.optional(Schema.String),
  authorName: Schema.String,
  tags: Tags,
});

const Friend = Schema.Struct({
  id: Schema.String,
  displayName: Schema.String,
});

export const Works = Schema.Array(Work);
export const Friends = Schema.Array(Friend);

export type VrchatWork = typeof Work.Type;
export type VrchatFriend = typeof Friend.Type;
