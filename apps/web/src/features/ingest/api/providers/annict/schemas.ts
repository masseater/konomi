import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Query = Schema.Struct({
  query: Schema.String,
  variables: Schema.Struct({ after: Schema.NullOr(Schema.String) }),
});

const PageInfo = Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: OptionalText });

const Work = Schema.Struct({
  annictId: Schema.Int,
  title: Schema.String,
  seasonYear: Schema.optional(Schema.NullOr(Schema.Int)),
});

const Episode = Schema.Struct({
  annictId: Schema.Int,
  numberText: OptionalText,
  title: OptionalText,
});

const Record = Schema.Struct({
  createdAt: Schema.String,
  ratingState: OptionalText,
  episode: Episode,
  work: Work,
});

const Status = Schema.Struct({ state: Schema.String, createdAt: Schema.String });

const Entry = Schema.Struct({ work: Work, status: Schema.optional(Schema.NullOr(Status)) });

const Records = Schema.Struct({ nodes: Schema.Array(Record), pageInfo: PageInfo });

const Entries = Schema.Struct({ nodes: Schema.Array(Entry), pageInfo: PageInfo });

const RecordsResponse = Schema.Struct({
  data: Schema.Struct({ viewer: Schema.Struct({ records: Records }) }),
});

const EntriesResponse = Schema.Struct({
  data: Schema.Struct({ viewer: Schema.Struct({ libraryEntries: Entries }) }),
});

type AnnictRecord = typeof Record.Type;
type AnnictEntry = typeof Entry.Type;
type AnnictWork = typeof Work.Type;

export type { AnnictEntry, AnnictRecord, AnnictWork };
export { EntriesResponse, Query, RecordsResponse };
