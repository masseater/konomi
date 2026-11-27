import { Clock, Effect } from "effect";

import { cursorStateOf, scheduleOf } from "#/features/ingest-history/api/providers/cursor-state";
import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import { pagesFor } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

import { PLAYLIST_INTERVAL_MS } from "./api";
import { pullLibrary } from "./library.server";
import { pullPlaylists } from "./playlists.server";
import { Cursor } from "./schemas";
import { pullWatched } from "./watched.server";

const cursorState = cursorStateOf(Cursor)({ backfilled: false });

export const pullYoutube = ({
  credential,
  cursor,
}: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* youtube() {
    const fetching = {
      headers: yield* bearerHeadersOf(credential),
      fetchedAt: yield* Clock.currentTimeMillis,
    };
    const state = cursorState.read(cursor);
    const pages = pagesFor(state.backfilled);
    const schedule = scheduleOf({
      at: state.playlistsAtMs,
      now: fetching.fetchedAt,
      every: PLAYLIST_INTERVAL_MS,
    });
    const watched = yield* pullWatched({
      credential,
      previous: state.history ?? [],
      fetchedAt: fetching.fetchedAt,
    });
    const playlists = yield* schedule.whenDue(pullPlaylists(fetching));
    const observations = [
      ...watched.observations,
      ...(yield* pullLibrary({ ...fetching, pages })),
      ...playlists,
    ];
    return {
      observations,
      cursor: yield* cursorState.write({
        backfilled: true,
        playlistsAtMs: schedule.stamp,
        history: watched.history,
      }),
    };
  }).pipe(Effect.withSpan("youtube.pull"));
