import { Array as Arr, Effect, Option, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import {
  epochOr,
  observeAt,
  pageOf,
  followedBy,
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
    const consumed = observeAt({
      kind: "consumed",
      context: Option.none(),
      at: epochOr(fetchedAt),
    });
    return pipe(
      items,
      Arr.map(({ track, played_at: playedAt }) =>
        consumed({ subject: trackOf(track), occurredAt: playedAt }),
      ),
      Arr.getSomes,
    );
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
    const endorsed = observeAt({
      kind: "endorsed",
      context: Option.none(),
      at: epochOr(fetchedAt),
    });
    return pipe(
      items,
      Arr.map(({ track, added_at: addedAt }) =>
        endorsed({ subject: trackOf(track), occurredAt: addedAt }),
      ),
      Arr.getSomes,
    );
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
        followedBy({ subjectOf: (subject) => subject, occurredAtOf: () => fetchedAt }),
      ),
    ),
  );
