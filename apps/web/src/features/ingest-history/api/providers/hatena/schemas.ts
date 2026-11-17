import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.String);

const Subjects = Schema.Union([Schema.String, Schema.Array(Schema.String)]);

const Bookmark = Schema.Struct({
  title: OptionalText,
  link: Schema.String,
  description: OptionalText,
  "dc:date": OptionalText,
  "dc:subject": Schema.optional(Subjects),
});

const Bookmarks = Schema.Struct({ item: Schema.optional(Schema.Array(Bookmark)) });

export const BookmarkFeed = Schema.Struct({ "rdf:RDF": Bookmarks });

export type HatenaBookmark = typeof Bookmark.Type;
