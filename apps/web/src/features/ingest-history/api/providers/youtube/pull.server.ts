import { Effect } from "effect";

import { cursorStateOf, scheduleOf } from "#/features/ingest-history/api/providers/cursor-state";
import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import { pagesFor } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { PLAYLIST_INTERVAL_MS } from "./api.ts";
import { pullLibrary } from "./library.server.ts";
import { pullPlaylists } from "./playlists.server.ts";
import { Cursor } from "./schemas.ts";
import { pullWatched } from "./watched.server.ts";

const cursorState = cursorStateOf(Cursor)({ backfilled: false });

export const pullYoutube = pullOf({
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
