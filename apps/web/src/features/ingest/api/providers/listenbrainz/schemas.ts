import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Artist = Schema.Struct({ artist_credit_name: Schema.String, artist_mbid: Schema.String });

const Mapping = Schema.Struct({
  recording_mbid: OptionalText,
  artists: Schema.optional(Schema.Array(Artist)),
});

const AdditionalInfo = Schema.Struct({
  recording_mbid: OptionalText,
  duration_ms: Schema.optional(Schema.NullOr(Schema.Finite)),
});

const TrackMetadata = Schema.Struct({
  track_name: Schema.String,
  artist_name: Schema.String,
  release_name: OptionalText,
  additional_info: Schema.optional(Schema.NullOr(AdditionalInfo)),
  mbid_mapping: Schema.optional(Schema.NullOr(Mapping)),
});

const Listen = Schema.Struct({
  listened_at: Schema.Int,
  recording_msid: Schema.String,
  track_metadata: TrackMetadata,
});

const ListensPayload = Schema.Struct({ listens: Schema.Array(Listen) });

const Listens = Schema.Struct({ payload: ListensPayload });

const LovedRecording = Schema.Struct({
  created: Schema.Int,
  recording_mbid: OptionalText,
  recording_msid: OptionalText,
  track_metadata: Schema.optional(Schema.NullOr(TrackMetadata)),
});

const Feedback = Schema.Struct({ feedback: Schema.Array(LovedRecording) });

type ListenBrainzListen = typeof Listen.Type;
type ListenBrainzLoved = typeof LovedRecording.Type;
type ListenBrainzTrack = typeof TrackMetadata.Type;

export type { ListenBrainzListen, ListenBrainzLoved, ListenBrainzTrack };
export { Feedback, Listens };
