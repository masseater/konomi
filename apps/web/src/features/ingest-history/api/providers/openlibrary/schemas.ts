import { Schema } from "effect";

const Names = Schema.String.pipe(Schema.Array, Schema.NullOr, Schema.optional);

const Work = Schema.Struct({
  title: Schema.String,
  key: Schema.String,
  author_keys: Names,
  author_names: Names,
  first_publish_year: Schema.Int.pipe(Schema.NullOr, Schema.optional),
});

const Entry = Schema.Struct({
  work: Work,
  logged_date: Schema.String.pipe(Schema.NullOr, Schema.optional),
});

export const ReadingLog = Schema.Struct({ reading_log_entries: Schema.Array(Entry) });

export type OpenLibraryEntry = typeof Entry.Type;
