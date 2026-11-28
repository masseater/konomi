import { Array as Arr, Option, pipe } from "effect";

import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf, pageOf } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api.ts";
import { FollowedArtists, RecentlyPlayed, SavedTracks } from "./schemas.ts";
import { followedArtistOf, trackOf } from "./subjects.ts";

const recent = listingOf({
  label: "recent",
  source: sourceOf({
    first: `${API}/me/player/recently-played?limit=${LIMIT}`,
    schema: RecentlyPlayed,
  })((body) => pageOf(body)),
})(
  datedObservationsOf({
    kind: "consumed",
    subjectOf: ({ track }) => trackOf(track),
    occurredAtOf: ({ played_at: playedAt }) => playedAt,
  }),
);

const saved = listingOf({
  label: "saved",
  source: sourceOf({ first: `${API}/me/tracks?limit=${LIMIT}`, schema: SavedTracks })((body) =>
    pageOf(body),
  ),
})(
  datedObservationsOf({
    kind: "endorsed",
    subjectOf: ({ track }) => trackOf(track),
    occurredAtOf: ({ added_at: addedAt }) => addedAt,
  }),
);

const followed = listingOf({
  label: "followed",
  source: sourceOf({
    first: `${API}/me/following?type=artist&limit=${LIMIT}`,
    schema: FollowedArtists,
  })(({ artists }) => {
    const { items, next } = pageOf(artists);
    return { items: pipe(items, Arr.map(followedArtistOf), Arr.getSomes), next };
  }),
})(datedObservationsOf({ kind: "followed", subjectOf: (subject) => Option.some(subject) }));

export const pullLibrary = pulledListings([recent, saved, followed]);
