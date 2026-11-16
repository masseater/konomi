import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Owner = Schema.Struct({ ownerType: OptionalText, id: OptionalText, name: OptionalText });

const Video = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  registeredAt: OptionalText,
  duration: Schema.optional(Schema.NullOr(Schema.Int)),
  owner: Schema.optional(Schema.NullOr(Owner)),
});

const VideoItem = Schema.Struct({
  video: Video,
  lastViewedAt: OptionalText,
  likedAt: OptionalText,
  addedAt: OptionalText,
});

const VideoItems = Schema.Array(VideoItem);

const VideoPage = Schema.Struct({
  data: Schema.Struct({ items: VideoItems, hasNext: Schema.optional(Schema.Boolean) }),
});

const MylistSummaries = Schema.Array(Schema.Struct({ id: Schema.Int, name: Schema.String }));

const MylistIndex = Schema.Struct({ data: Schema.Struct({ mylists: MylistSummaries }) });

const Mylist = Schema.Struct({ items: VideoItems });

const MylistPage = Schema.Struct({ data: Schema.Struct({ mylist: Mylist }) });

const FollowedUsers = Schema.Array(Schema.Struct({ id: Schema.Int, nickname: Schema.String }));

const FollowingPage = Schema.Struct({ data: Schema.Struct({ items: FollowedUsers }) });

const Cursor = Schema.Struct({ backfilled: Schema.Boolean });

type VideoEntry = typeof VideoItem.Type;

export type { VideoEntry };
export { Cursor, FollowingPage, MylistIndex, MylistPage, VideoPage };
