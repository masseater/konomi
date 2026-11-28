import { Option } from "effect";

import { collectedFrom, sourceOf } from "#/features/ingest-history/api/providers/listing.server";
import {
  collectedListsOf,
  datedObservationsOf,
} from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api.ts";
import { TOKEN_NEXT } from "./page.ts";
import { PlaylistItems, Playlists } from "./schemas.ts";
import { videoOf } from "./subjects.ts";

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
  entriesOf: ({ headers }, { id }) =>
    collectedFrom(
      sourceOf({
        first: `${API}/playlistItems?playlistId=${id}&part=snippet,contentDetails&maxResults=${LIMIT}`,
        schema: PlaylistItems,
        items: ({ items }) => items,
        next: TOKEN_NEXT,
      }),
    )(headers),
  observe: ({ snippet }) =>
    datedObservationsOf({
      kind: "collected",
      subjectOf: videoOf,
      occurredAtOf: (item) => item.snippet.publishedAt,
      contextOf: () => Option.some(snippet.title),
    }),
});
