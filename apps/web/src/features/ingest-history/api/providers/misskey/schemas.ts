import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const User = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  host: OptionalText,
  name: OptionalText,
});

const Tags = Schema.optional(Schema.NullOr(Schema.Array(Schema.String)));

const Note = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.String,
  text: OptionalText,
  user: User,
  tags: Tags,
});

const Favorites = Schema.Array(Schema.Struct({ createdAt: Schema.String, note: Note }));

const Reaction = Schema.Struct({ createdAt: Schema.String, type: OptionalText, note: Note });

const Reactions = Schema.Array(Reaction);

const Followee = Schema.optional(Schema.NullOr(User));

const Following = Schema.Array(Schema.Struct({ createdAt: Schema.String, followee: Followee }));

const Me = Schema.Struct({ id: Schema.String });

const Request = Schema.Struct({ limit: Schema.Int, userId: Schema.optional(Schema.String) });

type MisskeyNote = typeof Note.Type;

type MisskeyUser = typeof User.Type;

export type { MisskeyNote, MisskeyUser };
export { Favorites, Following, Me, Reactions, Request };
