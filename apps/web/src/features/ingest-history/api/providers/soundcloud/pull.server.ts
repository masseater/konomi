import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import {
  epochOr,
  observeAt,
  observationsOf,
} from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { collectFrom, fetchFrom, firstUrlOf, sessionOf } from "./fetching.server";
import type { Session } from "./fetching.server";
import { Followings, Me, PlayHistory, PlaylistLikes, TrackLikes } from "./schemas";
import { followedUserOf, playlistOf, trackOf } from "./subjects";

type Pulling = Session & Readonly<{ userId: number; pages: number }>;

const pullPlayed = (session: Pulling): Observing =>
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

const pullLikedTracks = (session: Pulling): Observing =>
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

const pullLikedPlaylists = (session: Pulling): Observing =>
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

const pullFollowings = (session: Pulling): Observing =>
  collectFrom({
    session,
    path: `/users/${session.userId}/followings`,
    pages: session.pages,
    schema: Followings,
  }).pipe(
    Effect.map(
      observationsOf("followed")({
        subjectOf: followedUserOf,
        occurredAtOf: () => session.fetchedAt,
      }),
    ),
  );

export const pullSoundcloud = pullOf({
  provider: "soundcloud",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* soundcloud() {
      const session = yield* sessionOf({ credential, fetchedAt });
      const me = yield* fetchFrom({ session, schema: Me })(firstUrlOf("/me"));
      const pulling: Pulling = { ...session, userId: me.id, pages };
      const observations = [
        ...(yield* pullPlayed(pulling)),
        ...(yield* pullLikedTracks(pulling)),
        ...(yield* pullLikedPlaylists(pulling)),
        ...(yield* pullFollowings(pulling)),
      ];
      return observations;
    }),
});
