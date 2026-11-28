import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorFrom, withRelations } from "#/features/ingest-history/api/providers/creator-input";
import { publishedOf, durationOf } from "#/features/ingest-history/api/providers/subject-fields";
import { orEmpty, subjectIn } from "#/features/ingest-history/api/providers/subject-in";
import type { SubjectType } from "#/shared/config";

import type { SpotifyArtist, SpotifyArtistRef, SpotifyTrack, SpotifyUrls } from "./schemas.ts";

const OPEN_URL = "https://open.spotify.com";
const FULL_DATE_LENGTH = 10;

const urlOf = (external: SpotifyUrls, path: string): string =>
  pipe(
    Option.fromNullishOr(external),
    Option.flatMap(({ spotify }) => Option.fromNullishOr(spotify)),
    Option.getOrElse(() => `${OPEN_URL}/${path}`),
  );

const creatorOf: (named: Readonly<{ artist: SpotifyArtistRef; id: string }>) => CreatorInput =
  creatorFrom({ provider: "spotify" })({
    externalId: ({ id }) => id,
    title: ({ artist }) => artist.name,
    url: ({ artist, id }) => urlOf(artist.external_urls, `artist/${id}`),
  });

const artistOf = (artist: SpotifyArtistRef): Option.Option<CreatorInput> =>
  pipe(
    Option.fromNullishOr(artist.id),
    Option.map((id) => creatorOf({ artist, id })),
  );

const releasedAtOf = (track: SpotifyTrack): Readonly<{ publishedAtMs?: number }> =>
  publishedOf(
    pipe(
      Option.fromNullishOr(track.album),
      Option.flatMap(({ release_date: date }) => Option.fromNullishOr(date)),
      Option.filter((date) => Str.length(date) === FULL_DATE_LENGTH),
    ),
  );

const creditsOf = (track: SpotifyTrack): readonly CreatorInput[] =>
  pipe(orEmpty(track.artists), Arr.map(artistOf), Arr.getSomes);

const spotify = subjectIn("spotify");

export const trackOf = (track: SpotifyTrack): Option.Option<SubjectInput> =>
  pipe(
    Option.fromNullishOr(track.id),
    Option.map((id) => {
      const type = Match.value(track.type).pipe(
        Match.when("episode", (): SubjectType => "episode"),
        Match.orElse((): SubjectType => "track"),
      );
      return spotify({
        externalId: id,
        type,
        title: track.name,
        url: urlOf(track.external_urls, `${type}/${id}`),
        ...durationOf(Option.fromNullishOr(track.duration_ms), "millis"),
        ...releasedAtOf(track),
        credits: creditsOf(track),
      });
    }),
  );

export const followedArtistOf = (artist: SpotifyArtist): Option.Option<SubjectInput> => {
  const relate = withRelations({ credits: [], tags: orEmpty(artist.genres) });
  return pipe(artistOf(artist), Option.map(relate));
};
