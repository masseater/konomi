import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { epochOr, observeAt } from "#/features/ingest/api/providers/observe";
import type { Fetching } from "#/features/ingest/api/providers/observe";
import { collectPages, pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { API, LIMIT } from "./api";
import { tokenPageOf } from "./page";
import { PlaylistItems, Playlists } from "./schemas";
import { playlistVideoOf } from "./subjects";

const pullPlaylist = (
  { headers, fetchedAt }: Fetching,
  { id, title }: Readonly<{ id: string; title: string }>,
): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* playlist() {
    const items = yield* collectPages({
      first: `${API}/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=${LIMIT}`,
      pages: pagesFor(false),
      fetchPage: (url) =>
        fetchJson({ url, headers, schema: PlaylistItems }).pipe(Effect.map(tokenPageOf(url))),
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
    const owned = yield* collectPages({
      first: `${API}/playlists?mine=true&part=snippet&maxResults=${LIMIT}`,
      pages: pagesFor(false),
      fetchPage: (url) =>
        fetchJson({ url, headers: fetching.headers, schema: Playlists }).pipe(
          Effect.map(tokenPageOf(url)),
        ),
    });
    const lists = yield* pipe(
      owned,
      Effect.forEach(({ id, snippet }) => pullPlaylist(fetching, { id, title: snippet.title })),
    );
    return Arr.flatten(lists);
  });

export { pullPlaylists };
