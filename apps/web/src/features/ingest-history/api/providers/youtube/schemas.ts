import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const Next = OptionalText;

const Tags = Schema.Array(Schema.String);

const VideoSnippet = Schema.Struct({
  title: Schema.String,
  channelId: OptionalText,
  channelTitle: OptionalText,
  publishedAt: OptionalText,
  tags: Tags.pipe(Schema.NullOr, Schema.optional),
});

const VideoDetails = Schema.Struct({ duration: OptionalText });

const Video = Schema.Struct({
  id: Schema.String,
  snippet: VideoSnippet,
  contentDetails: VideoDetails.pipe(Schema.NullOr, Schema.optional),
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
  contentDetails: ItemDetails.pipe(Schema.NullOr, Schema.optional),
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
