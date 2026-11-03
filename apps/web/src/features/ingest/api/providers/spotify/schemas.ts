import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Next = OptionalText;

const SpotifyUrl = Schema.Struct({ spotify: OptionalText });

const ExternalUrls = Schema.optional(Schema.NullOr(SpotifyUrl));

const ArtistRef = Schema.Struct({
  id: OptionalText,
  name: Schema.String,
  external_urls: ExternalUrls,
});

const Album = Schema.Struct({ release_date: OptionalText });

const Artists = Schema.Array(ArtistRef);

const Track = Schema.Struct({
  id: OptionalText,
  type: OptionalText,
  name: Schema.String,
  duration_ms: Schema.optional(Schema.NullOr(Schema.Int)),
  external_urls: ExternalUrls,
  artists: Schema.optional(Schema.NullOr(Artists)),
  album: Schema.optional(Schema.NullOr(Album)),
});

const OptionalTrack = Schema.optional(Schema.NullOr(Track));

const Played = Schema.Struct({ track: Track, played_at: Schema.String });

const RecentlyPlayed = Schema.Struct({ items: Schema.Array(Played) });

const Saved = Schema.Struct({ added_at: Schema.String, track: Track });

const SavedTracks = Schema.Struct({ items: Schema.Array(Saved), next: Next });

const Genres = Schema.Array(Schema.String);

const Artist = Schema.Struct({
  ...ArtistRef.fields,
  genres: Schema.optional(Schema.NullOr(Genres)),
});

const ArtistPage = Schema.Struct({ items: Schema.Array(Artist), next: Next });

const FollowedArtists = Schema.Struct({ artists: ArtistPage });

const Me = Schema.Struct({ id: Schema.String });

const Owner = Schema.Struct({ id: Schema.String });

const Playlist = Schema.Struct({ id: Schema.String, name: Schema.String, owner: Owner });

const Playlists = Schema.Struct({ items: Schema.Array(Playlist), next: Next });

const PlaylistEntry = Schema.Struct({
  added_at: OptionalText,
  item: OptionalTrack,
  track: OptionalTrack,
});

const PlaylistItems = Schema.Struct({ items: Schema.Array(PlaylistEntry), next: Next });

const Cursor = Schema.Struct({ backfilled: Schema.Boolean });

type SpotifyTrack = typeof Track.Type;
type SpotifyArtistRef = typeof ArtistRef.Type;
type SpotifyArtist = typeof Artist.Type;
type SpotifyUrls = typeof ExternalUrls.Type;
type SpotifyPlaylistEntry = typeof PlaylistEntry.Type;

export type { SpotifyArtist, SpotifyArtistRef, SpotifyPlaylistEntry, SpotifyTrack, SpotifyUrls };
export { Cursor, FollowedArtists, Me, PlaylistItems, Playlists, RecentlyPlayed, SavedTracks };
