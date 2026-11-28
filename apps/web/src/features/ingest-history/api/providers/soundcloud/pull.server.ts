import { Effect, Option } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { pulledListings } from "#/features/ingest-history/api/providers/listing.server";
import {
  datedObservationsOf,
  fetchedObservationsOf,
  presentObservationsOf,
} from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { collectionListing, fetchFrom, firstUrlOf, sessionOf } from "./fetching.server.ts";
import { Followings, Me, PlayHistory, PlaylistLikes, TrackLikes } from "./schemas.ts";
import type { SoundcloudTrack } from "./schemas.ts";
import { followedUserOf, playlistOf, trackOf } from "./subjects.ts";

const playedObservationsOf = presentObservationsOf("consumed")(
  ({
    played_at: playedAt,
    track,
  }: Readonly<{ played_at: number; track?: SoundcloudTrack | null | undefined }>) =>
    Option.map(Option.fromNullishOr(track), (found) => ({
      occurredAtMs: playedAt,
      subject: trackOf(found),
    })),
);

const likedObservationsOf =
  <Entry extends Readonly<{ created_at?: string | null | undefined }>>(
    subjectOf: (entry: Entry) => Option.Option<SubjectInput>,
  ) =>
  (fetchedAt: number): ((entries: readonly Entry[]) => readonly Observation[]) =>
    datedObservationsOf({
      kind: "endorsed",
      fetchedAt,
      subjectOf,
      occurredAtOf: ({ created_at: createdAt }) => createdAt,
    });

export const pullSoundcloud = pullOf({
  provider: "soundcloud",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* soundcloud() {
      const session = yield* sessionOf({ credential, fetchedAt });
      const me = yield* fetchFrom({ session, schema: Me })(firstUrlOf("/me"));
      const listing = collectionListing(session.clientId);
      const listings = pulledListings([
        listing({
          path: "/me/play-history/tracks",
          schema: PlayHistory,
          observe: () => playedObservationsOf,
        }),
        listing({
          path: `/users/${me.id}/track_likes`,
          schema: TrackLikes,
          observe: likedObservationsOf(({ track }) =>
            Option.map(Option.fromNullishOr(track), trackOf),
          ),
        }),
        listing({
          path: `/users/${me.id}/playlist_likes`,
          schema: PlaylistLikes,
          observe: likedObservationsOf(({ playlist }) =>
            Option.map(Option.fromNullishOr(playlist), playlistOf),
          ),
        }),
        listing({
          path: `/users/${me.id}/followings`,
          schema: Followings,
          observe: fetchedObservationsOf("followed")(followedUserOf),
        }),
      ]);
      return yield* listings({ headers: session.headers, pages, fetchedAt });
    }),
});
