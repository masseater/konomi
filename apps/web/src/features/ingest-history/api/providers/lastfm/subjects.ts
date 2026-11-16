import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";

import type { LastfmTrack } from "./schemas";

const ORIGIN = "https://www.last.fm";

const artistOf = (artist: LastfmTrack["artist"]): CreatorInput => {
  const url = pipe(
    Option.fromNullishOr(artist.url),
    Option.getOrElse(() => `${ORIGIN}/music/${encodeURIComponent(artist.name)}`),
  );
  return { provider: "lastfm", externalId: url, type: "person", title: artist.name, url };
};

const trackOf = (track: LastfmTrack): SubjectInput => ({
  provider: "lastfm",
  externalId: track.url,
  type: "track",
  title: track.name,
  url: track.url,
  credits: [artistOf(track.artist)],
  tags: [],
});

const tracksOf = (tracks: LastfmTrack | readonly LastfmTrack[]): readonly LastfmTrack[] =>
  Arr.ensure(tracks);

export { trackOf, tracksOf };
