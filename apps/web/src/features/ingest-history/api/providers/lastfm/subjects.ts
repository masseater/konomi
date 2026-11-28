import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorFrom } from "#/features/ingest-history/api/providers/creator-input";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { LastfmTrack } from "./schemas.ts";

const ORIGIN = "https://www.last.fm";

const artistUrlOf = ({ name, url }: LastfmTrack["artist"]): string =>
  pipe(
    Option.fromNullishOr(url),
    Option.getOrElse(() => `${ORIGIN}/music/${encodeURIComponent(name)}`),
  );

const artistOf: (artist: LastfmTrack["artist"]) => CreatorInput = creatorFrom({
  provider: "lastfm",
})({
  externalId: artistUrlOf,
  title: ({ name }) => name,
  url: artistUrlOf,
});

export const trackOf = (track: LastfmTrack): SubjectInput =>
  subjectIn("lastfm")({
    externalId: track.url,
    type: "track",
    title: track.name,
    url: track.url,
    credits: [artistOf(track.artist)],
  });

export const tracksOf = (tracks: LastfmTrack | readonly LastfmTrack[]): readonly LastfmTrack[] =>
  Arr.ensure(tracks);
