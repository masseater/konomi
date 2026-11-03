import { Array as Arr, Clock, Effect, Match, Option, Schema, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { freshOf } from "#/features/ingest/api/providers/fresh";
import { epochOr, observeAt } from "#/features/ingest/api/providers/observe";
import { collectPages, pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, LIBRARY_INTERVAL_MS, LIBRARY_LIMIT, RECENT_LIMIT } from "./api";
import { fetchSongs, headersOf, storefrontOf } from "./fetching.server";
import { Cursor } from "./schemas";
import { catalogIdOf, songOf } from "./subjects";

const NEVER = 0;
const FIRST_PAGE = 1;

const CursorJson = Schema.fromJsonString(Cursor);
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

type Listening = Readonly<{
  fetch: ReturnType<typeof fetchSongs>;
  storefront: string;
  fetchedAt: number;
}>;

type Recent = Readonly<{ observations: readonly Observation[]; recent: readonly string[] }>;

const pullRecent = (
  { fetch, storefront, fetchedAt }: Listening,
  previous: readonly string[],
): Effect.Effect<Recent, ProviderError> =>
  collectPages({
    first: `${API}/me/recent/played/tracks?limit=${RECENT_LIMIT}`,
    pages: FIRST_PAGE,
    fetchPage: fetch,
  }).pipe(
    Effect.map((songs) => {
      const recent = pipe(songs, Arr.map(catalogIdOf));
      const fresh = freshOf({ previous, current: recent });
      return {
        observations: pipe(
          songs,
          Arr.take(fresh.length),
          Arr.map((song) => songOf({ song, storefront })),
          Arr.getSomes,
          Arr.map((subject): Observation => ({
            kind: "consumed",
            subject,
            occurredAtMs: fetchedAt,
          })),
        ),
        recent,
      };
    }),
  );

const pullLibrary = ({
  fetch,
  storefront,
  fetchedAt,
}: Listening): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* library() {
    const songs = yield* collectPages({
      first: `${API}/me/library/songs?limit=${LIBRARY_LIMIT}`,
      pages: pagesFor(false),
      fetchPage: fetch,
    });
    const collected = observeAt({
      kind: "collected",
      context: Option.none(),
      at: epochOr(fetchedAt),
    });
    return pipe(
      songs,
      Arr.map((song) =>
        collected({
          subject: songOf({ song, storefront }),
          occurredAt: pipe(
            Option.fromNullishOr(song.attributes),
            Option.flatMap(({ dateAdded }) => Option.fromNullishOr(dateAdded)),
            Option.getOrUndefined,
          ),
        }),
      ),
      Arr.getSomes,
    );
  });

const pullAppleMusic = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* appleMusic() {
    const headers = yield* headersOf(credential);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const state = pipe(
      decodeCursor(cursor),
      Option.getOrElse((): typeof Cursor.Type => ({})),
    );
    const storefront = yield* Option.match(Option.fromUndefinedOr(state.storefront), {
      onNone: () => storefrontOf(headers),
      onSome: Effect.succeed,
    });
    const listening: Listening = { fetch: fetchSongs(headers), storefront, fetchedAt };
    const libraryAtMs = state.libraryAtMs ?? NEVER;
    const libraryDue = fetchedAt - libraryAtMs >= LIBRARY_INTERVAL_MS;
    const recent = yield* pullRecent(listening, state.recent ?? []);
    const library = yield* Match.value(libraryDue).pipe(
      Match.when(true, () => pullLibrary(listening)),
      Match.orElse(() => Effect.succeed([])),
    );
    return {
      observations: [...recent.observations, ...library],
      cursor: yield* encodeCursor({
        storefront,
        recent: recent.recent,
        libraryAtMs: Match.value(libraryDue).pipe(
          Match.when(true, () => fetchedAt),
          Match.orElse(() => libraryAtMs),
        ),
      }).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("apple-music.pull"));

export { pullAppleMusic };
