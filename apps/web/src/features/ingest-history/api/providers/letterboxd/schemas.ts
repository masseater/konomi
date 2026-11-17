import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.String);

const Entry = Schema.Struct({
  link: Schema.String,
  pubDate: OptionalText,
  "letterboxd:watchedDate": OptionalText,
  "letterboxd:filmTitle": OptionalText,
  "letterboxd:filmYear": OptionalText,
  "letterboxd:memberRating": OptionalText,
  "letterboxd:memberLike": OptionalText,
});

const Channel = Schema.Struct({ item: Schema.optional(Schema.Array(Entry)) });

export const DiaryFeed = Schema.Struct({ rss: Schema.Struct({ channel: Channel }) });

export type LetterboxdEntry = typeof Entry.Type;
