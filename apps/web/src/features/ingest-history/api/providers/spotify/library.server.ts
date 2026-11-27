import { Array as Arr, Effect, Option, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { jsonListing } from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf, pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api";
import { FollowedArtists, RecentlyPlayed, SavedTracks } from "./schemas";
import { followedArtistOf, trackOf } from "./subjects";

export const pullRecent = ({ headers, fetchedAt }: Fetching): Observing =>
  fetchJson({
    url: `${API}/me/player/recently-played?limit=${LIMIT}`,
    headers,
    schema: RecentlyPlayed,
  }).pipe(
    Effect.map(({ items }) => items),
    Effect.map(
      datedObservationsOf({
        kind: "consumed",
        fetchedAt,
        subjectOf: ({ track }) => trackOf(track),
        occurredAtOf: ({ played_at: playedAt }) => playedAt,
      }),
    ),
  );

export const pullSaved = jsonListing({
  kind: "endorsed",
  first: `${API}/me/tracks?limit=${LIMIT}`,
  schema: SavedTracks,
  pageOf: (body) => pageOf(body),
  subjectOf: ({ track }) => trackOf(track),
  occurredAtOf: ({ added_at: addedAt }) => addedAt,
});

export const pullFollowed = jsonListing({
  kind: "followed",
  first: `${API}/me/following?type=artist&limit=${LIMIT}`,
  schema: FollowedArtists,
  pageOf: ({ artists }) => {
    const { items, next } = pageOf(artists);
    return { items: pipe(items, Arr.map(followedArtistOf), Arr.getSomes), next };
  },
  subjectOf: (subject) => Option.some(subject),
});
