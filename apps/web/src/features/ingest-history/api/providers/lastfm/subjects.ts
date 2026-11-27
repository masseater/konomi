import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personIn } from "#/features/ingest-history/api/providers/creator-input";

import type { LastfmTrack } from "./schemas";

const ORIGIN = "https://www.last.fm";

const lastfm = personIn("lastfm");

const artistOf = (artist: LastfmTrack["artist"]): CreatorInput => {
  const url = pipe(
    Option.fromNullishOr(artist.url),
    Option.getOrElse(() => `${ORIGIN}/music/${encodeURIComponent(artist.name)}`),
  );
  return lastfm({ externalId: url, title: artist.name, url });
};

export const trackOf = (track: LastfmTrack): SubjectInput => ({
  provider: "lastfm",
  externalId: track.url,
  type: "track",
  title: track.name,
  url: track.url,
  credits: [artistOf(track.artist)],
  tags: [],
});

export const tracksOf = (tracks: LastfmTrack | readonly LastfmTrack[]): readonly LastfmTrack[] =>
  Arr.ensure(tracks);
