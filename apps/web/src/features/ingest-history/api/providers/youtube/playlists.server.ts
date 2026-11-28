import { collectedFrom } from "#/features/ingest-history/api/providers/listing.server";
import { collectedListsOf } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api.ts";
import { tokenSource } from "./page.ts";
import { PlaylistItems, Playlists } from "./schemas.ts";
import { playlistVideoOf } from "./subjects.ts";

export const pullPlaylists = collectedListsOf({
  listsOf: ({ headers }) =>
    collectedFrom(
      tokenSource({
        first: `${API}/playlists?mine=true&part=snippet&maxResults=${LIMIT}`,
        schema: Playlists,
      }),
    )(headers),
  nameOf: ({ snippet }) => snippet.title,
  entriesOf: ({ headers }, { id }) =>
    collectedFrom(
      tokenSource({
        first: `${API}/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=${LIMIT}`,
        schema: PlaylistItems,
      }),
    )(headers),
  subjectOf: playlistVideoOf,
  occurredAtOf: (item) => item.snippet.publishedAt,
});
