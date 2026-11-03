import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const OptionalInt = Schema.optional(Schema.NullOr(Schema.Int));

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
  user: Schema.optional(Schema.NullOr(User)),
});

const Playlist = Schema.Struct({
  id: Schema.Int,
  title: Schema.String,
  permalink_url: Schema.String,
  genre: OptionalText,
  tag_list: OptionalText,
  user: Schema.optional(Schema.NullOr(User)),
});

const Next = OptionalText;

const OptionalTrack = Schema.optional(Schema.NullOr(Track));

const Played = Schema.Struct({ played_at: Schema.Finite, track: OptionalTrack });

const PlayHistory = Schema.Struct({ collection: Schema.Array(Played), next_href: Next });

const TrackLike = Schema.Struct({ created_at: OptionalText, track: OptionalTrack });

const TrackLikes = Schema.Struct({ collection: Schema.Array(TrackLike), next_href: Next });

const PlaylistLike = Schema.Struct({
  created_at: OptionalText,
  playlist: Schema.optional(Schema.NullOr(Playlist)),
});

const PlaylistLikes = Schema.Struct({ collection: Schema.Array(PlaylistLike), next_href: Next });

const Followings = Schema.Struct({ collection: Schema.Array(User), next_href: Next });

const Me = Schema.Struct({ id: Schema.Int });

const Cursor = Schema.Struct({ backfilled: Schema.Boolean });

type SoundcloudUser = typeof User.Type;
type SoundcloudTrack = typeof Track.Type;
type SoundcloudPlaylist = typeof Playlist.Type;

export type { SoundcloudPlaylist, SoundcloudTrack, SoundcloudUser };
export { Cursor, Followings, Me, PlayHistory, PlaylistLikes, TrackLikes };
