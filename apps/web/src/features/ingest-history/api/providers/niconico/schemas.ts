import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const Owner = Schema.Struct({ ownerType: OptionalText, id: OptionalText, name: OptionalText });

const Video = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  registeredAt: OptionalText,
  duration: Schema.Int.pipe(Schema.NullOr, Schema.optional),
  owner: Owner.pipe(Schema.NullOr, Schema.optional),
});

const VideoItem = Schema.Struct({
  video: Video,
  lastViewedAt: OptionalText,
  likedAt: OptionalText,
  addedAt: OptionalText,
});

const VideoItems = Schema.Array(VideoItem);

export const VideoPage = Schema.Struct({
  data: Schema.Struct({ items: VideoItems, hasNext: Schema.optional(Schema.Boolean) }),
});

const MylistSummaries = Schema.Array(Schema.Struct({ id: Schema.Int, name: Schema.String }));

export const MylistIndex = Schema.Struct({ data: Schema.Struct({ mylists: MylistSummaries }) });

const Mylist = Schema.Struct({ items: VideoItems });

export const MylistPage = Schema.Struct({ data: Schema.Struct({ mylist: Mylist }) });

const FollowedUsers = Schema.Array(Schema.Struct({ id: Schema.Int, nickname: Schema.String }));

export const FollowingPage = Schema.Struct({ data: Schema.Struct({ items: FollowedUsers }) });

export type VideoEntry = typeof VideoItem.Type;
