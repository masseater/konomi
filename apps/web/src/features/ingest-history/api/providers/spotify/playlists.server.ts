import { Array as Arr, Effect, Option, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import {
  flatMapEach,
  pageOf,
  datedObservationsOf,
} from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { pagesFor, collectJsonPages } from "#/features/ingest-history/api/providers/paging.server";

import { API, LIMIT } from "./api";
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
): Observing =>
  Effect.gen(function* playlist() {
    const entries = yield* collectJsonPages({
      first: `${API}/playlists/${id}/items?limit=${LIMIT}`,
      headers,
      pages: pagesFor(false),
      schema: PlaylistItems,
      pageOf,
    });
    return datedObservationsOf({
      kind: "collected",
      listName: name,
      fetchedAt,
      entries,
      subjectOf: entryTrackOf,
      occurredAtOf: ({ added_at: addedAt }) => addedAt,
    });
  });

export const pullPlaylists = (fetching: Fetching): Observing =>
  Effect.gen(function* playlists() {
    const me = yield* fetchJson({ url: `${API}/me`, headers: fetching.headers, schema: Me });
    const owned = yield* collectJsonPages({
      first: `${API}/me/playlists?limit=${LIMIT}`,
      headers: fetching.headers,
      pages: pagesFor(false),
      schema: Playlists,
      pageOf,
    });
    const mine = pipe(
      owned,
      Arr.filter(({ owner }) => owner.id === me.id),
    );
    return yield* flatMapEach(mine, (found) => pullPlaylist(fetching, found));
  });
