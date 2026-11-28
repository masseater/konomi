import { Effect } from "effect";

import type { Credential } from "#/entities/connection";
import { cursorStateOf, scheduleOf } from "#/features/ingest-history/api/providers/cursor-state";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { LIBRARY_INTERVAL_MS } from "./api.ts";
import { headersOf, storefrontOf } from "./fetching.server.ts";
import { pullLibrary, pullRecent } from "./listening.server.ts";
import type { Listening } from "./listening.server.ts";
import { Cursor } from "./schemas.ts";

const listeningOf = ({
  credential,
  storefront,
  fetchedAt,
}: Readonly<{
  credential: Credential;
  storefront: string | undefined;
  fetchedAt: number;
}>): Effect.Effect<Listening, ProviderError> =>
  Effect.gen(function* listening() {
    const headers = yield* headersOf(credential);
    return { headers, storefront: yield* storefrontOf(headers)(storefront), fetchedAt };
  });

const cursorState = cursorStateOf(Cursor)({});

export const pullAppleMusic = pullOf({
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
