import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const Artist = Schema.Struct({ artist_credit_name: Schema.String, artist_mbid: Schema.String });

const Mapping = Schema.Struct({
  recording_mbid: OptionalText,
  artists: Artist.pipe(Schema.Array, Schema.optional),
});

const AdditionalInfo = Schema.Struct({
  recording_mbid: OptionalText,
  duration_ms: Schema.Finite.pipe(Schema.NullOr, Schema.optional),
});

const TrackMetadata = Schema.Struct({
  track_name: Schema.String,
  artist_name: Schema.String,
  release_name: OptionalText,
  additional_info: AdditionalInfo.pipe(Schema.NullOr, Schema.optional),
  mbid_mapping: Mapping.pipe(Schema.NullOr, Schema.optional),
});

const Listen = Schema.Struct({
  listened_at: Schema.Int,
  recording_msid: Schema.String,
  track_metadata: TrackMetadata,
});

const ListensPayload = Schema.Struct({ listens: Schema.Array(Listen) });

export const Listens = Schema.Struct({ payload: ListensPayload });

const LovedRecording = Schema.Struct({
  created: Schema.Int,
  recording_mbid: OptionalText,
  recording_msid: OptionalText,
  track_metadata: TrackMetadata.pipe(Schema.NullOr, Schema.optional),
});

export const Feedback = Schema.Struct({ feedback: Schema.Array(LovedRecording) });

export type ListenBrainzListen = typeof Listen.Type;
export type ListenBrainzLoved = typeof LovedRecording.Type;
export type ListenBrainzTrack = typeof TrackMetadata.Type;
