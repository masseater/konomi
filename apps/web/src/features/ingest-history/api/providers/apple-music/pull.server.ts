import { Effect } from "effect";

import { cursorStateOf, scheduleOf } from "#/features/ingest-history/api/providers/cursor-state";
import { pullWithState } from "#/features/ingest-history/api/providers/pull-of.server";

import { LIBRARY_INTERVAL_MS } from "./api.ts";
import { listeningOf, pullLibrary, pullRecent } from "./listening.server.ts";
import { Cursor } from "./schemas.ts";

const cursorState = cursorStateOf(Cursor)({});

export const pullAppleMusic = pullWithState({
  provider: "apple-music",
  state: cursorState,
  pull: ({ credential, state, fetchedAt }) =>
    Effect.gen(function* appleMusic() {
      const listening = yield* listeningOf({ credential, storefront: state.storefront, fetchedAt });
      const schedule = scheduleOf({
        at: state.libraryAtMs,
        now: fetchedAt,
        every: LIBRARY_INTERVAL_MS,
      });
      const recent = yield* pullRecent(listening)(state.recent ?? []);
      const library = yield* schedule.whenDue(pullLibrary(listening));
      return {
        observations: [...recent.observations, ...library],
        state: {
          storefront: listening.storefront,
          recent: recent.recent,
          libraryAtMs: schedule.stamp,
        },
      };
    }),
});
