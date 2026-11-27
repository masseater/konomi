import { Clock, Effect, Option } from "effect";

import { cursorStateOf, scheduleOf } from "#/features/ingest-history/api/providers/cursor-state";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

import { LIBRARY_INTERVAL_MS } from "./api";
import { fetchSongs, headersOf, storefrontOf } from "./fetching.server";
import { pullLibrary, pullRecent } from "./listening.server";
import type { Listening } from "./listening.server";
import { Cursor } from "./schemas";

const cursorState = cursorStateOf(Cursor)({});

const storefrontFor = (
  headers: Headers,
  recorded: string | undefined,
): Effect.Effect<string, ProviderError> =>
  Option.match(Option.fromUndefinedOr(recorded), {
    onNone: () => storefrontOf(headers),
    onSome: Effect.succeed,
  });

export const pullAppleMusic = ({
  credential,
  cursor,
}: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* appleMusic() {
    const headers = yield* headersOf(credential);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const state = cursorState.read(cursor);
    const storefront = yield* storefrontFor(headers, state.storefront);
    const listening: Listening = { fetch: fetchSongs(headers), storefront, fetchedAt };
    const schedule = scheduleOf({
      at: state.libraryAtMs,
      now: fetchedAt,
      every: LIBRARY_INTERVAL_MS,
    });
    const recent = yield* pullRecent(listening)(state.recent ?? []);
    const library = yield* schedule.whenDue(pullLibrary(listening));
    return {
      observations: [...recent.observations, ...library],
      cursor: yield* cursorState.write({
        storefront,
        recent: recent.recent,
        libraryAtMs: schedule.stamp,
      }),
    };
  }).pipe(Effect.withSpan("apple-music.pull"));
