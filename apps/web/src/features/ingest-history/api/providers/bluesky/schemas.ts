import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

export const Login = Schema.Struct({ identifier: Schema.String, password: Schema.String });

export const Session = Schema.Struct({ accessJwt: Schema.String, did: Schema.String });

const Profile = Schema.Struct({
  did: Schema.String,
  handle: Schema.String,
  displayName: OptionalText,
});

const PostRecord = Schema.Struct({ text: OptionalText, createdAt: OptionalText });

const Post = Schema.Struct({
  uri: Schema.String,
  author: Profile,
  record: PostRecord,
});

export const Likes = Schema.Struct({
  feed: Schema.Array(Schema.Struct({ post: Post })),
  cursor: OptionalText,
});

export const Follows = Schema.Struct({ follows: Schema.Array(Profile), cursor: OptionalText });

export type BlueskyPost = typeof Post.Type;
export type BlueskyProfile = typeof Profile.Type;
