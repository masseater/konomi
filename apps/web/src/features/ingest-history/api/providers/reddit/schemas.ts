import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const OptionalSeconds = Schema.Finite.pipe(Schema.NullOr, Schema.optional);

const Thing = Schema.Struct({
  kind: Schema.String,
  data: Schema.Struct({
    name: Schema.String,
    permalink: OptionalText,
    title: OptionalText,
    link_title: OptionalText,
    body: OptionalText,
    subreddit: OptionalText,
    author: OptionalText,
    created_utc: OptionalSeconds,
  }),
});

export const Listing = Schema.Struct({
  data: Schema.Struct({ after: OptionalText, children: Schema.Array(Thing) }),
});

export const Me = Schema.Struct({ name: Schema.String });

export type RedditThing = typeof Thing.Type;
