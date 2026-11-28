import { Effect } from "effect";

import { cursorStateOf, scheduleOf } from "#/features/ingest-history/api/providers/cursor-state";
import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import { pagesFor } from "#/features/ingest-history/api/providers/paging.server";
import { pullWithState } from "#/features/ingest-history/api/providers/pull-of.server";

import { PLAYLIST_INTERVAL_MS } from "./api";
import { pullLibrary } from "./library.server";
import { pullPlaylists } from "./playlists.server";
import { Cursor } from "./schemas";
import { pullWatched } from "./watched.server";

const cursorState = cursorStateOf(Cursor)({ backfilled: false });

export const pullYoutube = pullWithState({
  provider: "youtube",
  state: cursorState,
  pull: ({ credential, state, fetchedAt }) =>
    Effect.gen(function* youtube() {
      const fetching = { headers: yield* bearerHeadersOf(credential), fetchedAt };
      const pages = pagesFor(state.backfilled);
      const schedule = scheduleOf({
        at: state.playlistsAtMs,
        now: fetchedAt,
        every: PLAYLIST_INTERVAL_MS,
      });
      const watched = yield* pullWatched({
        credential,
        previous: state.history ?? [],
        fetchedAt,
      });
      const playlists = yield* schedule.whenDue(pullPlaylists(fetching));
      return {
        observations: [
          ...watched.observations,
          ...(yield* pullLibrary({ ...fetching, pages })),
          ...playlists,
        ],
        state: {
          backfilled: true,
          playlistsAtMs: schedule.stamp,
          history: watched.history,
        },
      };
    }),
});
