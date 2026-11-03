import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Next = OptionalText;

const Tags = Schema.Array(Schema.String);

const VideoSnippet = Schema.Struct({
  title: Schema.String,
  channelId: OptionalText,
  channelTitle: OptionalText,
  publishedAt: OptionalText,
  tags: Schema.optional(Schema.NullOr(Tags)),
});

const VideoDetails = Schema.Struct({ duration: OptionalText });

const Video = Schema.Struct({
  id: Schema.String,
  snippet: VideoSnippet,
  contentDetails: Schema.optional(Schema.NullOr(VideoDetails)),
});

const Videos = Schema.Struct({ items: Schema.Array(Video), nextPageToken: Next });

const ResourceId = Schema.Struct({ channelId: OptionalText, videoId: OptionalText });

const SubscriptionSnippet = Schema.Struct({
  title: Schema.String,
  publishedAt: OptionalText,
  resourceId: ResourceId,
});

const Subscription = Schema.Struct({ snippet: SubscriptionSnippet });

const Subscriptions = Schema.Struct({ items: Schema.Array(Subscription), nextPageToken: Next });

const PlaylistSnippet = Schema.Struct({ title: Schema.String });

const Playlist = Schema.Struct({ id: Schema.String, snippet: PlaylistSnippet });

const Playlists = Schema.Struct({ items: Schema.Array(Playlist), nextPageToken: Next });

const ItemSnippet = Schema.Struct({
  title: Schema.String,
  publishedAt: OptionalText,
  videoOwnerChannelId: OptionalText,
  videoOwnerChannelTitle: OptionalText,
  resourceId: ResourceId,
});

const ItemDetails = Schema.Struct({ videoPublishedAt: OptionalText });

const PlaylistItem = Schema.Struct({
  snippet: ItemSnippet,
  contentDetails: Schema.optional(Schema.NullOr(ItemDetails)),
});

const PlaylistItems = Schema.Struct({ items: Schema.Array(PlaylistItem), nextPageToken: Next });

const History = Schema.Array(Schema.String);

const Cursor = Schema.Struct({
  backfilled: Schema.Boolean,
  playlistsAtMs: Schema.optional(Schema.Finite),
  history: Schema.optional(History),
});

type YoutubeVideo = typeof Video.Type;
type YoutubeSubscription = typeof Subscription.Type;
type YoutubePlaylistItem = typeof PlaylistItem.Type;

export type { YoutubePlaylistItem, YoutubeSubscription, YoutubeVideo };
export { Cursor, PlaylistItems, Playlists, Subscriptions, Videos };
