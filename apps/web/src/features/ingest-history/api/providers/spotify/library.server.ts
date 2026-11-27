import { Array as Arr, Effect, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { pageOf, datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { collectObserved } from "#/features/ingest-history/api/providers/observed-pages.server";
import { collectJsonPages } from "#/features/ingest-history/api/providers/paging.server";

import { API, LIMIT } from "./api";
import { FollowedArtists, RecentlyPlayed, SavedTracks } from "./schemas";
import { followedArtistOf, trackOf } from "./subjects";

export const pullRecent = ({ headers, fetchedAt }: Fetching): Observing =>
  Effect.gen(function* recent() {
    const { items } = yield* fetchJson({
      url: `${API}/me/player/recently-played?limit=${LIMIT}`,
      headers,
      schema: RecentlyPlayed,
    });
    return datedObservationsOf({
      kind: "consumed",
      fetchedAt,
      entries: items,
      subjectOf: ({ track }) => trackOf(track),
      occurredAtOf: ({ played_at: playedAt }) => playedAt,
    });
  });

export const pullSaved = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Observing =>
  Effect.gen(function* saved() {
    const items = yield* collectJsonPages({
      first: `${API}/me/tracks?limit=${LIMIT}`,
      headers,
      pages,
      schema: SavedTracks,
      pageOf,
    });
    return datedObservationsOf({
      kind: "endorsed",
      fetchedAt,
      entries: items,
      subjectOf: ({ track }) => trackOf(track),
      occurredAtOf: ({ added_at: addedAt }) => addedAt,
    });
  });

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
