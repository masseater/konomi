import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { epochOr, observeAt } from "#/features/ingest/api/providers/observe";
import type { Fetching } from "#/features/ingest/api/providers/observe";
import { pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { API, LIMIT } from "./api";
import { collectTokenPages } from "./page";
import { PlaylistItems, Playlists } from "./schemas";
import { playlistVideoOf } from "./subjects";

const pullPlaylist = (
  { headers, fetchedAt }: Fetching,
  { id, title }: Readonly<{ id: string; title: string }>,
): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* playlist() {
    const items = yield* collectTokenPages({
      first: `${API}/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=${LIMIT}`,
      headers,
      pages: pagesFor(false),
      schema: PlaylistItems,
    });
    const collected = observeAt({
      kind: "collected",
      context: Option.some(title),
      at: epochOr(fetchedAt),
    });
    return pipe(
      items,
      Arr.map((item) =>
        collected({ subject: playlistVideoOf(item), occurredAt: item.snippet.publishedAt }),
      ),
      Arr.getSomes,
    );
  });

const pullPlaylists = (fetching: Fetching): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* playlists() {
    const owned = yield* collectTokenPages({
      first: `${API}/playlists?mine=true&part=snippet&maxResults=${LIMIT}`,
      headers: fetching.headers,
      pages: pagesFor(false),
      schema: Playlists,
    });
    const lists = yield* pipe(
      owned,
      Effect.forEach(({ id, snippet }) => pullPlaylist(fetching, { id, title: snippet.title })),
    );
    return Arr.flatten(lists);
  });

export { pullPlaylists };
