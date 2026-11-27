import { Effect } from "effect";

import { flatMapEach, datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { pagesFor } from "#/features/ingest-history/api/providers/paging.server";

import { API, LIMIT } from "./api";
import { collectTokenPages } from "./page";
import { PlaylistItems, Playlists } from "./schemas";
import { playlistVideoOf } from "./subjects";

const pullPlaylist = (
  { headers, fetchedAt }: Fetching,
  { id, title }: Readonly<{ id: string; title: string }>,
): Observing =>
  Effect.gen(function* playlist() {
    const items = yield* collectTokenPages({
      first: `${API}/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=${LIMIT}`,
      headers,
      pages: pagesFor(false),
      schema: PlaylistItems,
    });
    return datedObservationsOf({
      kind: "collected",
      listName: title,
      fetchedAt,
      entries: items,
      subjectOf: playlistVideoOf,
      occurredAtOf: (item) => item.snippet.publishedAt,
    });
  });

export const pullPlaylists = (fetching: Fetching): Observing =>
  Effect.gen(function* playlists() {
    const owned = yield* collectTokenPages({
      first: `${API}/playlists?mine=true&part=snippet&maxResults=${LIMIT}`,
      headers: fetching.headers,
      pages: pagesFor(false),
      schema: Playlists,
    });
    return yield* flatMapEach(owned, ({ id, snippet }) =>
      pullPlaylist(fetching, { id, title: snippet.title }),
    );
  });
