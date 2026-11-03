import { Schema } from "effect";

const Log = Schema.Struct({
  authorId: Schema.String,
  authorName: Schema.optional(Schema.NullOr(Schema.String)),
  content: Schema.optional(Schema.NullOr(Schema.String)),
  contentUrl: Schema.String,
  createdAt: Schema.String,
  isSelf: Schema.optional(Schema.NullOr(Schema.Boolean)),
});

const Meta = Schema.Struct({ page: Schema.Int, maxPage: Schema.Int });

const Posts = Schema.fromJsonString(Schema.Struct({ logs: Schema.Array(Log), meta: Meta }));

type TwilogLog = typeof Log.Type;

export type { TwilogLog };
export { Posts };
