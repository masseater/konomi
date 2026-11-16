import { Schema } from "effect";

const Tags = Schema.optional(Schema.Array(Schema.String));

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

const Works = Schema.Array(Work);
const Friends = Schema.Array(Friend);

type VrchatWork = typeof Work.Type;
type VrchatFriend = typeof Friend.Type;

export type { VrchatFriend, VrchatWork };
export { Friends, Works };
