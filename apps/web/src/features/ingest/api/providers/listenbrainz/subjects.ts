import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { durationFromMs } from "#/features/ingest/api/providers/subject-fields";

import { MUSICBRAINZ } from "./api";
import type { ListenBrainzListen, ListenBrainzLoved, ListenBrainzTrack } from "./schemas";

const MS_PER_SECOND = 1000;

const mappedArtistOf = ({
  artist_credit_name: title,
  artist_mbid: mbid,
}: Readonly<{ artist_credit_name: string; artist_mbid: string }>): CreatorInput => ({
  provider: "listenbrainz",
  externalId: `artist:${mbid}`,
  type: "person",
  title,
  url: `${MUSICBRAINZ}/artist/${mbid}`,
});

const namedArtistOf = (name: string): CreatorInput => {
  const url = new URL(`${MUSICBRAINZ}/search`);
  url.searchParams.set("query", name);
  url.searchParams.set("type", "artist");
  return {
    provider: "listenbrainz",
    externalId: `artist-name:${name}`,
    type: "person",
    title: name,
    url: url.toString(),
  };
};

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

const searchUrlOf = (track: ListenBrainzTrack): string => {
  const url = new URL(`${MUSICBRAINZ}/search`);
  url.searchParams.set("query", `${track.track_name} ${track.artist_name}`);
  url.searchParams.set("type", "recording");
  return url.toString();
};

const trackOf =
  (fallbackId: string) =>
  (track: ListenBrainzTrack): SubjectInput => {
    const mbid = recordingMbidOf(track);
    return {
      provider: "listenbrainz",
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
      ...durationFromMs(
        pipe(
          Option.fromNullishOr(track.additional_info),
          Option.flatMap(({ duration_ms: ms }) => Option.fromNullishOr(ms)),
        ),
      ),
      credits: artistsOf(track),
      tags: Option.toArray(Option.fromNullishOr(track.release_name)),
    };
  };

const listenObservationsOf = (listens: readonly ListenBrainzListen[]): readonly Observation[] =>
  pipe(
    listens,
    Arr.map((listen): Observation => ({
      kind: "consumed",
      subject: trackOf(listen.recording_msid)(listen.track_metadata),
      occurredAtMs: listen.listened_at * MS_PER_SECOND,
    })),
  );

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

const lovedObservationsOf = (loved: readonly ListenBrainzLoved[]): readonly Observation[] =>
  pipe(loved, Arr.map(lovedObservationOf), Arr.getSomes);

export { listenObservationsOf, lovedObservationsOf };
