import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { personIn } from "#/features/ingest-history/api/providers/creator-input";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";
import { durationFromMs } from "#/features/ingest-history/api/providers/subject-fields";
import { subjectIn } from "#/features/ingest-history/api/providers/subject-in";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";

import { MUSICBRAINZ } from "./api";
import type { ListenBrainzListen, ListenBrainzLoved, ListenBrainzTrack } from "./schemas";

const MS_PER_SECOND = 1000;

const listenbrainz = personIn("listenbrainz");

const mappedArtistOf = ({
  artist_credit_name: title,
  artist_mbid: mbid,
}: Readonly<{ artist_credit_name: string; artist_mbid: string }>): CreatorInput =>
  listenbrainz({
    externalId: `artist:${mbid}`,
    title,
    url: `${MUSICBRAINZ}/artist/${mbid}`,
  });

const searchUrlFor = (type: string, query: string): string =>
  urlWith(`${MUSICBRAINZ}/search`, { query, type });

const namedArtistOf = (name: string): CreatorInput =>
  listenbrainz({
    externalId: `artist-name:${name}`,
    title: name,
    url: searchUrlFor("artist", name),
  });

const artistsOf = (track: ListenBrainzTrack): readonly CreatorInput[] =>
  pipe(
    Option.fromNullishOr(track.mbid_mapping),
    Option.flatMap(({ artists }) => Option.fromUndefinedOr(artists)),
    Option.filter(Arr.isReadonlyArrayNonEmpty),
    Option.map(Arr.map(mappedArtistOf)),
    Option.getOrElse(() => [namedArtistOf(track.artist_name)]),
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
      ...durationFromMs(duration),
      credits: artistsOf(track),
      tags: Option.toArray(Option.fromNullishOr(track.release_name)),
    });
  };

export const listenObservationsOf = (
  listens: readonly ListenBrainzListen[],
): readonly Observation[] =>
  observationsOf("consumed")({
    subjectOf: (listen: ListenBrainzListen) =>
      trackOf(listen.recording_msid)(listen.track_metadata),
    occurredAtOf: (listen: ListenBrainzListen) => listen.listened_at * MS_PER_SECOND,
  })(listens);

const lovedIdOf = (recording: ListenBrainzLoved): string =>
  pipe(
    Option.fromNullishOr(recording.recording_msid),
    Option.orElse(() => Option.fromNullishOr(recording.recording_mbid)),
    Option.getOrElse(() => String(recording.created)),
  );

const lovedObservationOf = (recording: ListenBrainzLoved): Option.Option<Observation> => {
  const lovedTrackOf = trackOf(lovedIdOf(recording));
  return pipe(
    Option.fromNullishOr(recording.track_metadata),
    Option.map(lovedTrackOf),
    Option.map((subject): Observation => ({
      kind: "endorsed",
      subject,
      occurredAtMs: recording.created * MS_PER_SECOND,
    })),
  );
};

export const lovedObservationsOf = (loved: readonly ListenBrainzLoved[]): readonly Observation[] =>
  pipe(loved, Arr.map(lovedObservationOf), Arr.getSomes);
