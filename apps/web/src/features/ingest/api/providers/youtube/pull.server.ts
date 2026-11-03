import { Clock, Effect, Match, Option, Schema, pipe } from "effect";

import { bearerHeadersOf } from "#/features/ingest/api/providers/oauth.server";
import type { Fetching } from "#/features/ingest/api/providers/observe";
import { pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { PLAYLIST_INTERVAL_MS } from "./api";
import { pullLiked, pullSubscriptions } from "./library.server";
import { pullPlaylists } from "./playlists.server";
import { Cursor } from "./schemas";
import { pullWatched } from "./watched.server";

const NEVER = 0;

const CursorJson = Schema.fromJsonString(Cursor);
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

const pullYoutube = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* youtube() {
    const fetching: Fetching = {
      headers: yield* bearerHeadersOf(credential),
      fetchedAt: yield* Clock.currentTimeMillis,
    };
    const state = pipe(
      decodeCursor(cursor),
      Option.getOrElse((): typeof Cursor.Type => ({ backfilled: false })),
    );
    const pages = pagesFor(state.backfilled);
    const playlistsAtMs = state.playlistsAtMs ?? NEVER;
    const playlistsDue = fetching.fetchedAt - playlistsAtMs >= PLAYLIST_INTERVAL_MS;
    const watched = yield* pullWatched({
      credential,
      previous: state.history ?? [],
      fetchedAt: fetching.fetchedAt,
    });
    const playlists = yield* Match.value(playlistsDue).pipe(
      Match.when(true, () => pullPlaylists(fetching)),
      Match.orElse(() => Effect.succeed([])),
    );
    const observations = [
      ...watched.observations,
      ...(yield* pullLiked({ ...fetching, pages })),
      ...(yield* pullSubscriptions({ ...fetching, pages })),
      ...playlists,
    ];
    return {
      observations,
      cursor: yield* encodeCursor({
        backfilled: true,
        playlistsAtMs: Match.value(playlistsDue).pipe(
          Match.when(true, () => fetching.fetchedAt),
          Match.orElse(() => playlistsAtMs),
        ),
        history: watched.history,
      }).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("youtube.pull"));

export { pullYoutube };
