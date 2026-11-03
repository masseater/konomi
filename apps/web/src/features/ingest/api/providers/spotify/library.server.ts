import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { epochOr, observeAt, pageOf } from "#/features/ingest/api/providers/observe";
import type { Fetching } from "#/features/ingest/api/providers/observe";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { API, LIMIT } from "./api";
import { collectOffsetPages } from "./page";
import { FollowedArtists, RecentlyPlayed, SavedTracks } from "./schemas";
import { followedArtistOf, trackOf } from "./subjects";

const pullRecent = ({
  headers,
  fetchedAt,
}: Fetching): Effect.Effect<readonly Observation[], ProviderError> =>
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

const pullSaved = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* saved() {
    const items = yield* collectOffsetPages({
      first: `${API}/me/tracks?limit=${LIMIT}`,
      headers,
      pages,
      schema: SavedTracks,
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

const pullFollowed = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Effect.Effect<readonly Observation[], ProviderError> =>
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
        Arr.map((subject): Observation => ({ kind: "followed", subject, occurredAtMs: fetchedAt })),
      ),
    ),
  );

export { pullFollowed, pullRecent, pullSaved };
