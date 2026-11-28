import { Array as Arr, Effect, Option, pipe } from "effect";

import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { collectedFrom, sourceOf } from "#/features/ingest-history/api/providers/listing.server";
import { collectedListsOf, pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetched, Fetching } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api.ts";
import { Me, PlaylistItems, Playlists } from "./schemas.ts";
import type { SpotifyPlaylist, SpotifyPlaylistEntry } from "./schemas.ts";
import { trackOf } from "./subjects.ts";

const entryTrackOf = (entry: SpotifyPlaylistEntry): ReturnType<typeof trackOf> =>
  pipe(
    Option.fromNullishOr(entry.item),
    Option.orElse(() => Option.fromNullishOr(entry.track)),
    Option.flatMap(trackOf),
  );

const ownedOf = ({ headers }: Fetching): Fetched<readonly SpotifyPlaylist[]> =>
  Effect.gen(function* owned() {
    const me = yield* fetchJson({ url: `${API}/me`, headers, schema: Me });
    const playlists = yield* collectedFrom(
      sourceOf({ first: `${API}/me/playlists?limit=${LIMIT}`, schema: Playlists })(pageOf),
    )(headers);
    return pipe(
      playlists,
      Arr.filter(({ owner }) => owner.id === me.id),
    );
  });

export const pullPlaylists = collectedListsOf({
  listsOf: ownedOf,
  nameOf: ({ name }) => name,
  entriesOf: ({ headers }, { id }) =>
    collectedFrom(
      sourceOf({ first: `${API}/playlists/${id}/items?limit=${LIMIT}`, schema: PlaylistItems })(
        pageOf,
      ),
    )(headers),
  subjectOf: entryTrackOf,
  occurredAtOf: ({ added_at: addedAt }) => addedAt,
});
