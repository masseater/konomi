import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Login = Schema.Struct({ identifier: Schema.String, password: Schema.String });

const Session = Schema.Struct({ accessJwt: Schema.String, did: Schema.String });

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

const Likes = Schema.Struct({
  feed: Schema.Array(Schema.Struct({ post: Post })),
  cursor: OptionalText,
});

const Follows = Schema.Struct({ follows: Schema.Array(Profile), cursor: OptionalText });

type BlueskyPost = typeof Post.Type;
type BlueskyProfile = typeof Profile.Type;

export type { BlueskyPost, BlueskyProfile };
export { Follows, Likes, Login, Session };
