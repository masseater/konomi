import { Schema } from "effect";

const Log = Schema.Struct({
  authorId: Schema.String,
  authorName: Schema.String.pipe(Schema.NullOr, Schema.optional),
  content: Schema.String.pipe(Schema.NullOr, Schema.optional),
  contentUrl: Schema.String,
  createdAt: Schema.String,
});

const Meta = Schema.Struct({ page: Schema.Int, maxPage: Schema.Int });

export const Posts = Schema.fromJsonString(Schema.Struct({ logs: Schema.Array(Log), meta: Meta }));

export type TwilogLog = typeof Log.Type;
