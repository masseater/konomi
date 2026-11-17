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

export const Videos = Schema.Struct({ items: Schema.Array(Video), nextPageToken: Next });

const ResourceId = Schema.Struct({ channelId: OptionalText, videoId: OptionalText });

const SubscriptionSnippet = Schema.Struct({
  title: Schema.String,
  publishedAt: OptionalText,
  resourceId: ResourceId,
});

const Subscription = Schema.Struct({ snippet: SubscriptionSnippet });

export const Subscriptions = Schema.Struct({
  items: Schema.Array(Subscription),
  nextPageToken: Next,
});

const PlaylistSnippet = Schema.Struct({ title: Schema.String });

const Playlist = Schema.Struct({ id: Schema.String, snippet: PlaylistSnippet });

export const Playlists = Schema.Struct({ items: Schema.Array(Playlist), nextPageToken: Next });

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

export const PlaylistItems = Schema.Struct({
  items: Schema.Array(PlaylistItem),
  nextPageToken: Next,
});

const History = Schema.Array(Schema.String);

export const Cursor = Schema.Struct({
  backfilled: Schema.Boolean,
  playlistsAtMs: Schema.optional(Schema.Finite),
  history: Schema.optional(History),
});

export type YoutubeVideo = typeof Video.Type;
export type YoutubeSubscription = typeof Subscription.Type;
export type YoutubePlaylistItem = typeof PlaylistItem.Type;
