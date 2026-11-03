import { Schema } from "effect";

const Users = Schema.Struct({ data: Schema.Array(Schema.Struct({ id: Schema.String })) });

const Followed = Schema.Struct({
  broadcaster_id: Schema.String,
  broadcaster_login: Schema.String,
  broadcaster_name: Schema.String,
  followed_at: Schema.String,
});

const Pagination = Schema.Struct({ cursor: Schema.optional(Schema.NullOr(Schema.String)) });

const FollowedChannels = Schema.Struct({
  data: Schema.Array(Followed),
  pagination: Schema.optional(Schema.NullOr(Pagination)),
});

type TwitchFollowed = typeof Followed.Type;

export type { TwitchFollowed };
export { FollowedChannels, Users };
