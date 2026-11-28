import { collectedFrom, sourceOf } from "#/features/ingest-history/api/providers/listing.server";
import { collectedListsOf } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api.ts";
import { TOKEN_NEXT } from "./page.ts";
import { PlaylistItems, Playlists } from "./schemas.ts";
import { playlistVideoOf } from "./subjects.ts";

export const pullPlaylists = collectedListsOf({
  listsOf: ({ headers }) =>
    collectedFrom(
      sourceOf({
        first: `${API}/playlists?mine=true&part=snippet&maxResults=${LIMIT}`,
        schema: Playlists,
        items: ({ items }) => items,
        next: TOKEN_NEXT,
      }),
    )(headers),
  nameOf: ({ snippet }) => snippet.title,
  entriesOf: ({ headers }, { id }) =>
    collectedFrom(
      sourceOf({
        first: `${API}/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=${LIMIT}`,
        schema: PlaylistItems,
        items: ({ items }) => items,
        next: TOKEN_NEXT,
      }),
    )(headers),
  subjectOf: playlistVideoOf,
  occurredAtOf: (item) => item.snippet.publishedAt,
});
