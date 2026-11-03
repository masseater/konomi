import { Schema } from "effect";

const Names = Schema.optional(Schema.NullOr(Schema.Array(Schema.String)));

const Work = Schema.Struct({
  title: Schema.String,
  key: Schema.String,
  author_keys: Names,
  author_names: Names,
  first_publish_year: Schema.optional(Schema.NullOr(Schema.Int)),
});

const Entry = Schema.Struct({
  work: Work,
  logged_date: Schema.optional(Schema.NullOr(Schema.String)),
});

const ReadingLog = Schema.Struct({ reading_log_entries: Schema.Array(Entry) });

type OpenLibraryEntry = typeof Entry.Type;

export type { OpenLibraryEntry };
export { ReadingLog };
