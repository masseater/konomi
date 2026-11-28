import { Array as Arr, Option, pipe } from "effect";

import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api.ts";
import { FOLLOW_NEXT } from "./paging.ts";
import { FollowedArtists, RecentlyPlayed, SavedTracks } from "./schemas.ts";
import { followedArtistOf, trackOf } from "./subjects.ts";

const recent = listingOf({
  label: "recent",
  source: sourceOf({
    first: `${API}/me/player/recently-played?limit=${LIMIT}`,
    schema: RecentlyPlayed,
    items: ({ items }) => items,
  }),
})(
  datedObservationsOf({
    kind: "consumed",
    subjectOf: ({ track }) => trackOf(track),
    occurredAtOf: ({ played_at: playedAt }) => playedAt,
  }),
);

const saved = listingOf({
  label: "saved",
  source: sourceOf({
    first: `${API}/me/tracks?limit=${LIMIT}`,
    schema: SavedTracks,
    items: ({ items }) => items,
    next: FOLLOW_NEXT,
  }),
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
    items: ({ artists }) => pipe(artists.items, Arr.map(followedArtistOf), Arr.getSomes),
    next: { follow: ({ artists }) => Option.fromNullishOr(artists.next) },
  }),
})(datedObservationsOf({ kind: "followed", subjectOf: (subject) => Option.some(subject) }));

export const pullLibrary = pulledListings([recent, saved, followed]);
