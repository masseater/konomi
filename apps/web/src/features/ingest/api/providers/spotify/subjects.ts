import { Array as Arr, DateTime, Match, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { withRelations } from "#/features/ingest/api/providers/observe";
import type { SubjectType } from "#/shared/config";

import type { SpotifyArtist, SpotifyArtistRef, SpotifyTrack, SpotifyUrls } from "./schemas";

const OPEN_URL = "https://open.spotify.com";
const MS_PER_SECOND = 1000;
const FULL_DATE_LENGTH = 10;

const urlOf = (external: SpotifyUrls, path: string): string =>
  pipe(
    Option.fromNullishOr(external),
    Option.flatMap(({ spotify }) => Option.fromNullishOr(spotify)),
    Option.getOrElse(() => `${OPEN_URL}/${path}`),
  );

const creatorOf =
  (artist: SpotifyArtistRef) =>
  (id: string): CreatorInput => ({
    provider: "spotify",
    externalId: id,
    type: "person",
    title: artist.name,
    url: urlOf(artist.external_urls, `artist/${id}`),
  });

const artistOf = (artist: SpotifyArtistRef): Option.Option<CreatorInput> =>
  pipe(Option.fromNullishOr(artist.id), Option.map(creatorOf(artist)));

const releasedAtOf = (track: SpotifyTrack): Readonly<{ publishedAtMs?: number }> =>
  pipe(
    Option.fromNullishOr(track.album),
    Option.flatMap(({ release_date: date }) => Option.fromNullishOr(date)),
    Option.filter((date) => Str.length(date) === FULL_DATE_LENGTH),
    Option.flatMap(DateTime.make),
    Option.map((date) => ({ publishedAtMs: DateTime.toEpochMillis(date) })),
    Option.getOrElse(() => ({})),
  );

const durationOf = (track: SpotifyTrack): Readonly<{ durationSec?: number }> =>
  pipe(
    Option.fromNullishOr(track.duration_ms),
    Option.map((ms) => ({ durationSec: Math.round(ms / MS_PER_SECOND) })),
    Option.getOrElse(() => ({})),
  );

const creditsOf = (track: SpotifyTrack): readonly CreatorInput[] =>
  pipe(
    Option.fromNullishOr(track.artists),
    Option.map(Arr.map(artistOf)),
    Option.map(Arr.getSomes),
    Option.getOrElse((): readonly CreatorInput[] => []),
  );

const genresOf = (artist: SpotifyArtist): readonly string[] =>
  pipe(
    Option.fromNullishOr(artist.genres),
    Option.getOrElse((): readonly string[] => []),
  );

const trackOf = (track: SpotifyTrack): Option.Option<SubjectInput> =>
  pipe(
    Option.fromNullishOr(track.id),
    Option.map((id) => {
      const type = Match.value(track.type).pipe(
        Match.when("episode", (): SubjectType => "episode"),
        Match.orElse((): SubjectType => "track"),
      );
      return {
        provider: "spotify" as const,
        externalId: id,
        type,
        title: track.name,
        url: urlOf(track.external_urls, `${type}/${id}`),
        ...durationOf(track),
        ...releasedAtOf(track),
        credits: creditsOf(track),
        tags: [],
      };
    }),
  );

const followedArtistOf = (artist: SpotifyArtist): Option.Option<SubjectInput> => {
  const relate = withRelations({ credits: [], tags: genresOf(artist) });
  return pipe(Option.fromNullishOr(artist.id), Option.map(creatorOf(artist)), Option.map(relate));
};

export { followedArtistOf, trackOf };
