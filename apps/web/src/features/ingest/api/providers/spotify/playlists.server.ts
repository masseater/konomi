import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { epochOr, observeAt } from "#/features/ingest/api/providers/observe";
import type { Fetching } from "#/features/ingest/api/providers/observe";
import { pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { API, LIMIT } from "./api";
import { collectOffsetPages } from "./page";
import { Me, PlaylistItems, Playlists } from "./schemas";
import type { SpotifyPlaylistEntry } from "./schemas";
import { trackOf } from "./subjects";

const entryTrackOf = (entry: SpotifyPlaylistEntry): ReturnType<typeof trackOf> =>
  pipe(
    Option.fromNullishOr(entry.item),
    Option.orElse(() => Option.fromNullishOr(entry.track)),
    Option.flatMap(trackOf),
  );

const pullPlaylist = (
  { headers, fetchedAt }: Fetching,
  { id, name }: Readonly<{ id: string; name: string }>,
): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* playlist() {
    const entries = yield* collectOffsetPages({
      first: `${API}/playlists/${id}/items?limit=${LIMIT}`,
      headers,
      pages: pagesFor(false),
      schema: PlaylistItems,
    });
    const collected = observeAt({
      kind: "collected",
      context: Option.some(name),
      at: epochOr(fetchedAt),
    });
    return pipe(
      entries,
      Arr.map((entry) => collected({ subject: entryTrackOf(entry), occurredAt: entry.added_at })),
      Arr.getSomes,
    );
  });

const pullPlaylists = (fetching: Fetching): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* playlists() {
    const me = yield* fetchJson({ url: `${API}/me`, headers: fetching.headers, schema: Me });
    const owned = yield* collectOffsetPages({
      first: `${API}/me/playlists?limit=${LIMIT}`,
      headers: fetching.headers,
      pages: pagesFor(false),
      schema: Playlists,
    });
    const mine = pipe(
      owned,
      Arr.filter(({ owner }) => owner.id === me.id),
    );
    const lists = yield* pipe(
      mine,
      Effect.forEach((found) => pullPlaylist(fetching, found)),
    );
    return Arr.flatten(lists);
  });

export { pullPlaylists };
