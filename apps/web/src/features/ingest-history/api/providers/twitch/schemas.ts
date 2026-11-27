import { Schema } from "effect";

export const Users = Schema.Struct({ data: Schema.Array(Schema.Struct({ id: Schema.String })) });

const Followed = Schema.Struct({
  broadcaster_id: Schema.String,
  broadcaster_login: Schema.String,
  broadcaster_name: Schema.String,
  followed_at: Schema.String,
});

const Pagination = Schema.Struct({ cursor: Schema.String.pipe(Schema.NullOr, Schema.optional) });

export const FollowedChannels = Schema.Struct({
  data: Schema.Array(Followed),
  pagination: Pagination.pipe(Schema.NullOr, Schema.optional),
});

export type TwitchFollowed = typeof Followed.Type;
