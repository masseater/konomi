import { Array as Arr, Effect, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { datedObservationsOf, pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { collectObserved } from "#/features/ingest-history/api/providers/observed-pages.server";
import { collectJsonPages } from "#/features/ingest-history/api/providers/paging.server";

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

export const pullSaved = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Observing =>
  collectJsonPages({
    first: `${API}/me/tracks?limit=${LIMIT}`,
    headers,
    pages,
    schema: SavedTracks,
    pageOf,
  }).pipe(
    Effect.map(
      datedObservationsOf({
        kind: "endorsed",
        fetchedAt,
        subjectOf: ({ track }) => trackOf(track),
        occurredAtOf: ({ added_at: addedAt }) => addedAt,
      }),
    ),
  );

export const pullFollowed = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Observing =>
  collectObserved({
    kind: "followed",
    first: `${API}/me/following?type=artist&limit=${LIMIT}`,
    pages,
    fetchedAt,
    headers,
    schema: FollowedArtists,
    pageOf: ({ artists }) => {
      const { items, next } = pageOf(artists);
      return { items: pipe(items, Arr.map(followedArtistOf), Arr.getSomes), next };
    },
    subjectOf: (subject) => subject,
  });
