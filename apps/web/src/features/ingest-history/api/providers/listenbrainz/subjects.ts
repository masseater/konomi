import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorFrom } from "#/features/ingest-history/api/providers/creator-input";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";
import { durationOf } from "#/features/ingest-history/api/providers/subject-fields";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";

import { MUSICBRAINZ } from "./api.ts";
import type { ListenBrainzListen, ListenBrainzLoved, ListenBrainzTrack } from "./schemas.ts";

const MS_PER_SECOND = 1000;

const searchUrlFor = (type: string, query: string): string =>
  urlWith(`${MUSICBRAINZ}/search`, { query, type });

const artistOf: (artist: Readonly<{ name: string; mbid: Option.Option<string> }>) => CreatorInput =
  creatorFrom({ provider: "listenbrainz" })({
    externalId: ({ name, mbid }) =>
      pipe(
        mbid,
        Option.match({ onNone: () => `artist-name:${name}`, onSome: (id) => `artist:${id}` }),
      ),
    title: ({ name }) => name,
    url: ({ name, mbid }) =>
      pipe(
        mbid,
        Option.match({
          onNone: () => searchUrlFor("artist", name),
          onSome: (id) => `${MUSICBRAINZ}/artist/${id}`,
        }),
      ),
  });

const artistsOf = (track: ListenBrainzTrack): readonly CreatorInput[] =>
  pipe(
    Option.fromNullishOr(track.mbid_mapping),
    Option.flatMap(({ artists }) => Option.fromUndefinedOr(artists)),
    Option.filter(Arr.isReadonlyArrayNonEmpty),
    Option.map(
      Arr.map(({ artist_credit_name: name, artist_mbid: mbid }) =>
        artistOf({ name, mbid: Option.some(mbid) }),
      ),
    ),
    Option.getOrElse(() => [artistOf({ name: track.artist_name, mbid: Option.none() })]),
  );

const recordingMbidOf = (track: ListenBrainzTrack): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(track.mbid_mapping),
    Option.flatMap(({ recording_mbid: mbid }) => Option.fromNullishOr(mbid)),
    Option.orElse(() =>
      pipe(
        Option.fromNullishOr(track.additional_info),
        Option.flatMap(({ recording_mbid: mbid }) => Option.fromNullishOr(mbid)),
      ),
    ),
  );

const searchUrlOf = (track: ListenBrainzTrack): string =>
  searchUrlFor("recording", `${track.track_name} ${track.artist_name}`);

const trackOf =
  (fallbackId: string) =>
  (track: ListenBrainzTrack): SubjectInput => {
    const mbid = recordingMbidOf(track);
    const duration = pipe(
      Option.fromNullishOr(track.additional_info),
      Option.flatMap(({ duration_ms: ms }) => Option.fromNullishOr(ms)),
    );
    return subjectIn("listenbrainz")({
      externalId: pipe(
        mbid,
        Option.map((found) => `recording:${found}`),
        Option.getOrElse(() => `msid:${fallbackId}`),
      ),
      type: "track",
      title: track.track_name,
      url: pipe(
        mbid,
        Option.map((found) => `${MUSICBRAINZ}/recording/${found}`),
        Option.getOrElse(() => searchUrlOf(track)),
      ),
      ...durationOf(duration, "millis"),
      credits: artistsOf(track),
      tags: Option.toArray(Option.fromNullishOr(track.release_name)),
    });
  };

export const listenObservationsOf = observationsOf("consumed")((listen: ListenBrainzListen) =>
  Option.some({
    subject: trackOf(listen.recording_msid)(listen.track_metadata),
    occurredAtMs: listen.listened_at * MS_PER_SECOND,
  }),
);

const lovedIdOf = (recording: ListenBrainzLoved): string =>
  pipe(
    Option.fromNullishOr(recording.recording_msid),
    Option.orElse(() => Option.fromNullishOr(recording.recording_mbid)),
    Option.getOrElse(() => String(recording.created)),
  );

export const lovedObservationsOf = observationsOf("endorsed")((recording: ListenBrainzLoved) => {
  const lovedTrackOf = trackOf(lovedIdOf(recording));
  return pipe(
    Option.fromNullishOr(recording.track_metadata),
    Option.map(lovedTrackOf),
    Option.map((subject) => ({ subject, occurredAtMs: recording.created * MS_PER_SECOND })),
  );
});
