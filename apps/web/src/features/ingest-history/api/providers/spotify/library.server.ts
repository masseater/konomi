import { Array as Arr, Effect, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import {
  pageOf,
  observationsOf,
  datedObservationsOf,
} from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import {
  collectPages,
  collectJsonPages,
} from "#/features/ingest-history/api/providers/paging.server";

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
  collectPages({
    first: `${API}/me/following?type=artist&limit=${LIMIT}`,
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers, schema: FollowedArtists }).pipe(
        Effect.map(({ artists }) => pageOf(artists)),
      ),
  }).pipe(
    Effect.map((artists) =>
      pipe(
        artists,
        Arr.map(followedArtistOf),
        Arr.getSomes,
        observationsOf("followed")({
          subjectOf: (subject) => subject,
          occurredAtOf: () => fetchedAt,
        }),
      ),
    ),
  );
