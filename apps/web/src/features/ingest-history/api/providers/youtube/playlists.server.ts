import { collectedListsOf } from "#/features/ingest-history/api/providers/observe";
import { pagesFor } from "#/features/ingest-history/api/providers/paging.server";

import { API, LIMIT } from "./api";
import { collectTokenPages } from "./page";
import { PlaylistItems, Playlists } from "./schemas";
import { playlistVideoOf } from "./subjects";

export const pullPlaylists = collectedListsOf({
  listsOf: ({ headers }) =>
    collectTokenPages({
      first: `${API}/playlists?mine=true&part=snippet&maxResults=${LIMIT}`,
      headers,
      pages: pagesFor(false),
      schema: Playlists,
    }),
  nameOf: ({ snippet }) => snippet.title,
  entriesOf: ({ headers }, { id }) =>
    collectTokenPages({
      first: `${API}/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=${LIMIT}`,
      headers,
      pages: pagesFor(false),
      schema: PlaylistItems,
    }),
  subjectOf: playlistVideoOf,
  occurredAtOf: (item) => item.snippet.publishedAt,
});
