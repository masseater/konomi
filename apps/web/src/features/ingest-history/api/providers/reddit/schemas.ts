import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const OptionalSeconds = Schema.optional(Schema.NullOr(Schema.Finite));

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

const Listing = Schema.Struct({
  data: Schema.Struct({ after: OptionalText, children: Schema.Array(Thing) }),
});

const Me = Schema.Struct({ name: Schema.String });

type RedditThing = typeof Thing.Type;

export type { RedditThing };
export { Listing, Me };
