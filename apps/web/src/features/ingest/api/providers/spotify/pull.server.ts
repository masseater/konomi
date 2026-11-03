import { Clock, Effect, Option, Schema, pipe } from "effect";

import { bearerHeadersOf } from "#/features/ingest/api/providers/oauth.server";
import type { Fetching } from "#/features/ingest/api/providers/observe";
import { pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { pullFollowed, pullRecent, pullSaved } from "./library.server";
import { pullPlaylists } from "./playlists.server";
import { Cursor } from "./schemas";

const CursorJson = Schema.fromJsonString(Cursor);
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

const pullSpotify = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* spotify() {
    const fetching: Fetching = {
      headers: yield* bearerHeadersOf(credential),
      fetchedAt: yield* Clock.currentTimeMillis,
    };
    const { backfilled } = pipe(
      decodeCursor(cursor),
      Option.getOrElse(() => ({ backfilled: false })),
    );
    const pages = pagesFor(backfilled);
    const observations = [
      ...(yield* pullRecent(fetching)),
      ...(yield* pullSaved({ ...fetching, pages })),
      ...(yield* pullFollowed({ ...fetching, pages })),
      ...(yield* pullPlaylists(fetching)),
    ];
    return {
      observations,
      cursor: yield* encodeCursor({ backfilled: true }).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("spotify.pull"));

export { pullSpotify };
