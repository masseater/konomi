import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

export const Query = Schema.Struct({
  query: Schema.String,
  variables: Schema.Struct({ after: Schema.NullOr(Schema.String) }),
});

const PageInfo = Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: OptionalText });

const Work = Schema.Struct({
  annictId: Schema.Int,
  title: Schema.String,
  seasonYear: Schema.Int.pipe(Schema.NullOr, Schema.optional),
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

const Entry = Schema.Struct({ work: Work, status: Status.pipe(Schema.NullOr, Schema.optional) });

const Records = Schema.Struct({ nodes: Schema.Array(Record), pageInfo: PageInfo });

const Entries = Schema.Struct({ nodes: Schema.Array(Entry), pageInfo: PageInfo });

export const RecordsResponse = Schema.Struct({
  data: Schema.Struct({ viewer: Schema.Struct({ records: Records }) }),
});

export const EntriesResponse = Schema.Struct({
  data: Schema.Struct({ viewer: Schema.Struct({ libraryEntries: Entries }) }),
});

export type AnnictRecord = typeof Record.Type;
export type AnnictEntry = typeof Entry.Type;
export type AnnictWork = typeof Work.Type;
