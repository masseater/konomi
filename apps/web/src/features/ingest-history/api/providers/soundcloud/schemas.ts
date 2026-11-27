import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const OptionalInt = Schema.Int.pipe(Schema.NullOr, Schema.optional);

const User = Schema.Struct({
  id: Schema.Int,
  username: Schema.String,
  permalink_url: Schema.String,
});

const Track = Schema.Struct({
  id: Schema.Int,
  title: Schema.String,
  permalink_url: Schema.String,
  full_duration: OptionalInt,
  duration: OptionalInt,
  genre: OptionalText,
  tag_list: OptionalText,
  display_date: OptionalText,
  created_at: OptionalText,
  user: User.pipe(Schema.NullOr, Schema.optional),
});

const Playlist = Schema.Struct({
  id: Schema.Int,
  title: Schema.String,
  permalink_url: Schema.String,
  genre: OptionalText,
  tag_list: OptionalText,
  user: User.pipe(Schema.NullOr, Schema.optional),
});

const Next = OptionalText;

const OptionalTrack = Track.pipe(Schema.NullOr, Schema.optional);

const Played = Schema.Struct({ played_at: Schema.Finite, track: OptionalTrack });

export const PlayHistory = Schema.Struct({ collection: Schema.Array(Played), next_href: Next });

const TrackLike = Schema.Struct({ created_at: OptionalText, track: OptionalTrack });

export const TrackLikes = Schema.Struct({ collection: Schema.Array(TrackLike), next_href: Next });

const PlaylistLike = Schema.Struct({
  created_at: OptionalText,
  playlist: Playlist.pipe(Schema.NullOr, Schema.optional),
});

export const PlaylistLikes = Schema.Struct({
  collection: Schema.Array(PlaylistLike),
  next_href: Next,
});

export const Followings = Schema.Struct({ collection: Schema.Array(User), next_href: Next });

export const Me = Schema.Struct({ id: Schema.Int });

export type SoundcloudUser = typeof User.Type;
export type SoundcloudTrack = typeof Track.Type;
export type SoundcloudPlaylist = typeof Playlist.Type;
