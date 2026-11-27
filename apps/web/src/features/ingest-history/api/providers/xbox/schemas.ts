import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.String);

const History = Schema.Struct({ lastTimePlayed: OptionalText });

const Title = Schema.Struct({
  titleId: Schema.String,
  name: Schema.String,
  type: OptionalText,
  titleHistory: Schema.optional(History),
});

const Person = Schema.Struct({ xuid: Schema.String, gamertag: Schema.String });

const Titles = Title.pipe(Schema.Array, Schema.optional);
const People = Person.pipe(Schema.Array, Schema.optional);

export const TitlesResponse = Schema.Struct({ content: Schema.Struct({ titles: Titles }) });

export const FriendsResponse = Schema.Struct({ content: Schema.Struct({ people: People }) });

export type XboxTitle = typeof Title.Type;
export type XboxPerson = typeof Person.Type;
