import { collectedListsOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { pagesFor } from "#/features/ingest-history/api/providers/paging.server";

import { API, LIMIT } from "./api";
import { collectTokenPages } from "./page";
import { PlaylistItems, Playlists } from "./schemas";
import { playlistVideoOf } from "./subjects";

export const pullPlaylists = (fetching: Fetching): Observing =>
  collectedListsOf({
    fetching,
    listsOf: () =>
      collectTokenPages({
        first: `${API}/playlists?mine=true&part=snippet&maxResults=${LIMIT}`,
        headers: fetching.headers,
        pages: pagesFor(false),
        schema: Playlists,
      }),
    nameOf: ({ snippet }) => snippet.title,
    entriesOf: ({ id }) =>
      collectTokenPages({
        first: `${API}/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=${LIMIT}`,
        headers: fetching.headers,
        pages: pagesFor(false),
        schema: PlaylistItems,
      }),
    subjectOf: playlistVideoOf,
    occurredAtOf: (item) => item.snippet.publishedAt,
  });
