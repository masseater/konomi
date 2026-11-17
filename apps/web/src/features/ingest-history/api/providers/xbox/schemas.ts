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

const Titles = Schema.optional(Schema.Array(Title));
const People = Schema.optional(Schema.Array(Person));

export const TitlesResponse = Schema.Struct({ content: Schema.Struct({ titles: Titles }) });

export const FriendsResponse = Schema.Struct({ content: Schema.Struct({ people: People }) });

export type XboxTitle = typeof Title.Type;
export type XboxPerson = typeof Person.Type;
