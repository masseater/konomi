import { Array as Arr, Clock, Effect, Option, Schema, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr, observeAt } from "#/features/ingest/api/providers/observe";
import { pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { collectFrom, fetchFrom, firstUrlOf, sessionOf } from "./fetching.server";
import type { Session } from "./fetching.server";
import { Cursor, Followings, Me, PlayHistory, PlaylistLikes, TrackLikes } from "./schemas";
import { followedUserOf, playlistOf, trackOf } from "./subjects";

const CursorJson = Schema.fromJsonString(Cursor);
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

type Pulling = Session & Readonly<{ userId: number; pages: number }>;

const pullPlayed = (session: Pulling): Effect.Effect<readonly Observation[], ProviderError> =>
  collectFrom({
    session,
    path: "/me/play-history/tracks",
    pages: session.pages,
    schema: PlayHistory,
  }).pipe(
    Effect.map((played) =>
      pipe(
        played,
        Arr.map(({ played_at: playedAt, track }) =>
          pipe(
            Option.fromNullishOr(track),
            Option.map((found): Observation => ({
              kind: "consumed",
              subject: trackOf(found),
              occurredAtMs: playedAt,
            })),
          ),
        ),
        Arr.getSomes,
      ),
    ),
  );

const likedOf =
  (session: Pulling) =>
  (
    likes: readonly Readonly<{
      subject: Option.Option<SubjectInput>;
      occurredAt: string | null | undefined;
    }>[],
  ): readonly Observation[] => {
    const at = epochOr(session.fetchedAt);
    const endorsed = observeAt({ kind: "endorsed", context: Option.none(), at });
    return pipe(likes, Arr.map(endorsed), Arr.getSomes);
  };

const pullLikedTracks = (session: Pulling): Effect.Effect<readonly Observation[], ProviderError> =>
  collectFrom({
    session,
    path: `/users/${session.userId}/track_likes`,
    pages: session.pages,
    schema: TrackLikes,
  }).pipe(
    Effect.map(
      Arr.map(({ track, created_at: createdAt }) => ({
        subject: Option.map(Option.fromNullishOr(track), trackOf),
        occurredAt: createdAt,
      })),
    ),
    Effect.map(likedOf(session)),
  );

const pullLikedPlaylists = (
  session: Pulling,
): Effect.Effect<readonly Observation[], ProviderError> =>
  collectFrom({
    session,
    path: `/users/${session.userId}/playlist_likes`,
    pages: session.pages,
    schema: PlaylistLikes,
  }).pipe(
    Effect.map(
      Arr.map(({ playlist, created_at: createdAt }) => ({
        subject: Option.map(Option.fromNullishOr(playlist), playlistOf),
        occurredAt: createdAt,
      })),
    ),
    Effect.map(likedOf(session)),
  );

const pullFollowings = (session: Pulling): Effect.Effect<readonly Observation[], ProviderError> =>
  collectFrom({
    session,
    path: `/users/${session.userId}/followings`,
    pages: session.pages,
    schema: Followings,
  }).pipe(
    Effect.map(
      Arr.map((user): Observation => ({
        kind: "followed",
        subject: followedUserOf(user),
        occurredAtMs: session.fetchedAt,
      })),
    ),
  );

const pullSoundcloud = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* soundcloud() {
    const session = yield* sessionOf({ credential, fetchedAt: yield* Clock.currentTimeMillis });
    const me = yield* fetchFrom({ session, schema: Me })(firstUrlOf("/me"));
    const { backfilled } = pipe(
      decodeCursor(cursor),
      Option.getOrElse(() => ({ backfilled: false })),
    );
    const pulling: Pulling = { ...session, userId: me.id, pages: pagesFor(backfilled) };
    const observations = [
      ...(yield* pullPlayed(pulling)),
      ...(yield* pullLikedTracks(pulling)),
      ...(yield* pullLikedPlaylists(pulling)),
      ...(yield* pullFollowings(pulling)),
    ];
    return {
      observations,
      cursor: yield* encodeCursor({ backfilled: true }).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("soundcloud.pull"));

export { pullSoundcloud };
