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

const pullLiked = <Entry extends Readonly<{ created_at?: string | null | undefined }>>({
  session,
  path,
  schema,
  subjectOf,
}: Readonly<{
  session: Pulling;
  path: string;
  schema: Schema.Decoder<
    Readonly<{ collection: readonly Entry[]; next_href?: string | null | undefined }>
  >;
  subjectOf: (entry: Entry) => Option.Option<SubjectInput>;
}>): Observing =>
  collectFrom({ session, path, pages: session.pages, schema }).pipe(
    Effect.map(
      datedObservationsOf({
        kind: "endorsed",
        fetchedAt: session.fetchedAt,
        subjectOf,
        occurredAtOf: ({ created_at: createdAt }) => createdAt,
      }),
    ),
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
        ...(yield* pullLiked({
          session: pulling,
          path: `/users/${pulling.userId}/track_likes`,
          schema: TrackLikes,
          subjectOf: ({ track }) => Option.map(Option.fromNullishOr(track), trackOf),
        })),
        ...(yield* pullLiked({
          session: pulling,
          path: `/users/${pulling.userId}/playlist_likes`,
          schema: PlaylistLikes,
          subjectOf: ({ playlist }) => Option.map(Option.fromNullishOr(playlist), playlistOf),
        })),
        ...(yield* pullFollowings(pulling)),
      ];
      return observations;
    }),
});
