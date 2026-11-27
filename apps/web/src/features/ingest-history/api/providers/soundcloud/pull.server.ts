import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import {
  datedObservationsOf,
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

const pullLiked = <Entry>({
  session,
  path,
  schema,
  subjectOf,
  occurredAtOf,
}: Readonly<{
  session: Pulling;
  path: string;
  schema: Schema.Decoder<
    Readonly<{ collection: readonly Entry[]; next_href?: string | null | undefined }>
  >;
  subjectOf: (entry: Entry) => Option.Option<SubjectInput>;
  occurredAtOf: (entry: Entry) => string | null | undefined;
}>): Observing =>
  collectFrom({ session, path, pages: session.pages, schema }).pipe(
    Effect.map((entries) =>
      datedObservationsOf({
        kind: "endorsed",
        fetchedAt: session.fetchedAt,
        entries,
        subjectOf,
        occurredAtOf,
      }),
    ),
  );

const pullLikedTracks = (session: Pulling): Observing =>
  pullLiked({
    session,
    path: `/users/${session.userId}/track_likes`,
    schema: TrackLikes,
    subjectOf: ({ track }) => Option.map(Option.fromNullishOr(track), trackOf),
    occurredAtOf: ({ created_at: createdAt }) => createdAt,
  });

const pullLikedPlaylists = (session: Pulling): Observing =>
  pullLiked({
    session,
    path: `/users/${session.userId}/playlist_likes`,
    schema: PlaylistLikes,
    subjectOf: ({ playlist }) => Option.map(Option.fromNullishOr(playlist), playlistOf),
    occurredAtOf: ({ created_at: createdAt }) => createdAt,
  });

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
