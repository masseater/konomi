import { Array as Arr, Effect, Option, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { collectedListsOf, pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetched, Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { pagesFor, collectJsonPages } from "#/features/ingest-history/api/providers/paging.server";

import { API, LIMIT } from "./api";
import { Me, PlaylistItems, Playlists } from "./schemas";
import type { SpotifyPlaylist, SpotifyPlaylistEntry } from "./schemas";
import { trackOf } from "./subjects";

const entryTrackOf = (entry: SpotifyPlaylistEntry): ReturnType<typeof trackOf> =>
  pipe(
    Option.fromNullishOr(entry.item),
    Option.orElse(() => Option.fromNullishOr(entry.track)),
    Option.flatMap(trackOf),
  );

const ownedOf = ({ headers }: Fetching): Fetched<readonly SpotifyPlaylist[]> =>
  Effect.gen(function* owned() {
    const me = yield* fetchJson({ url: `${API}/me`, headers, schema: Me });
    const playlists = yield* collectJsonPages({
      first: `${API}/me/playlists?limit=${LIMIT}`,
      headers,
      pages: pagesFor(false),
      schema: Playlists,
      pageOf,
    });
    return pipe(
      playlists,
      Arr.filter(({ owner }) => owner.id === me.id),
    );
  });

export const pullPlaylists = (fetching: Fetching): Observing =>
  collectedListsOf({
    fetching,
    listsOf: () => ownedOf(fetching),
    nameOf: ({ name }) => name,
    entriesOf: ({ id }) =>
      collectJsonPages({
        first: `${API}/playlists/${id}/items?limit=${LIMIT}`,
        headers: fetching.headers,
        pages: pagesFor(false),
        schema: PlaylistItems,
        pageOf,
      }),
    subjectOf: entryTrackOf,
    occurredAtOf: ({ added_at: addedAt }) => addedAt,
  });
