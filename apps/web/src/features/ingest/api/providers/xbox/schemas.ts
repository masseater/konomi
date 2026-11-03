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

const TitlesResponse = Schema.Struct({ content: Schema.Struct({ titles: Titles }) });

const FriendsResponse = Schema.Struct({ content: Schema.Struct({ people: People }) });

type XboxTitle = typeof Title.Type;
type XboxPerson = typeof Person.Type;

export type { XboxPerson, XboxTitle };
export { FriendsResponse, TitlesResponse };
