import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const Next = OptionalText;

const SpotifyUrl = Schema.Struct({ spotify: OptionalText });

const ExternalUrls = SpotifyUrl.pipe(Schema.NullOr, Schema.optional);

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
  duration_ms: Schema.Int.pipe(Schema.NullOr, Schema.optional),
  external_urls: ExternalUrls,
  artists: Artists.pipe(Schema.NullOr, Schema.optional),
  album: Album.pipe(Schema.NullOr, Schema.optional),
});

const OptionalTrack = Track.pipe(Schema.NullOr, Schema.optional);

const Played = Schema.Struct({ track: Track, played_at: Schema.String });

export const RecentlyPlayed = Schema.Struct({ items: Schema.Array(Played) });

const Saved = Schema.Struct({ added_at: Schema.String, track: Track });

export const SavedTracks = Schema.Struct({ items: Schema.Array(Saved), next: Next });

const Genres = Schema.Array(Schema.String);

const Artist = Schema.Struct({
  ...ArtistRef.fields,
  genres: Genres.pipe(Schema.NullOr, Schema.optional),
});

const ArtistPage = Schema.Struct({ items: Schema.Array(Artist), next: Next });

export const FollowedArtists = Schema.Struct({ artists: ArtistPage });

export const Me = Schema.Struct({ id: Schema.String });

const Owner = Schema.Struct({ id: Schema.String });

const Playlist = Schema.Struct({ id: Schema.String, name: Schema.String, owner: Owner });

export const Playlists = Schema.Struct({ items: Schema.Array(Playlist), next: Next });

const PlaylistEntry = Schema.Struct({
  added_at: OptionalText,
  item: OptionalTrack,
  track: OptionalTrack,
});

export const PlaylistItems = Schema.Struct({ items: Schema.Array(PlaylistEntry), next: Next });

export type SpotifyTrack = typeof Track.Type;
export type SpotifyArtistRef = typeof ArtistRef.Type;
export type SpotifyArtist = typeof Artist.Type;
export type SpotifyUrls = typeof ExternalUrls.Type;
export type SpotifyPlaylistEntry = typeof PlaylistEntry.Type;

export type SpotifyPlaylist = typeof Playlist.Type;
