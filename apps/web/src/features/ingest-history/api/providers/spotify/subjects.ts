import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personIn, withRelations } from "#/features/ingest-history/api/providers/creator-input";
import {
  durationFromMs,
  publishedOf,
} from "#/features/ingest-history/api/providers/subject-fields";
import type { SubjectType } from "#/shared/config";

import type { SpotifyArtist, SpotifyArtistRef, SpotifyTrack, SpotifyUrls } from "./schemas";

const OPEN_URL = "https://open.spotify.com";
const FULL_DATE_LENGTH = 10;

const urlOf = (external: SpotifyUrls, path: string): string =>
  pipe(
    Option.fromNullishOr(external),
    Option.flatMap(({ spotify }) => Option.fromNullishOr(spotify)),
    Option.getOrElse(() => `${OPEN_URL}/${path}`),
  );

const creatorOf =
  (artist: SpotifyArtistRef) =>
  (id: string): CreatorInput =>
    personIn("spotify")({
      externalId: id,
      title: artist.name,
      url: urlOf(artist.external_urls, `artist/${id}`),
    });

const artistOf = (artist: SpotifyArtistRef): Option.Option<CreatorInput> =>
  pipe(Option.fromNullishOr(artist.id), Option.map(creatorOf(artist)));

const releasedAtOf = (track: SpotifyTrack): Readonly<{ publishedAtMs?: number }> =>
  publishedOf(
    pipe(
      Option.fromNullishOr(track.album),
      Option.flatMap(({ release_date: date }) => Option.fromNullishOr(date)),
      Option.filter((date) => Str.length(date) === FULL_DATE_LENGTH),
    ),
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

export const trackOf = (track: SpotifyTrack): Option.Option<SubjectInput> =>
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
        ...durationFromMs(Option.fromNullishOr(track.duration_ms)),
        ...releasedAtOf(track),
        credits: creditsOf(track),
        tags: [],
      };
    }),
  );

export const followedArtistOf = (artist: SpotifyArtist): Option.Option<SubjectInput> => {
  const relate = withRelations({ credits: [], tags: genresOf(artist) });
  return pipe(Option.fromNullishOr(artist.id), Option.map(creatorOf(artist)), Option.map(relate));
};
