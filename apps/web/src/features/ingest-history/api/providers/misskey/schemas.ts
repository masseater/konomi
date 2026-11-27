import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const User = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  host: OptionalText,
  name: OptionalText,
});

const Tags = Schema.String.pipe(Schema.Array, Schema.NullOr, Schema.optional);

const Note = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.String,
  text: OptionalText,
  user: User,
  tags: Tags,
});

export const Favorites = Schema.Array(Schema.Struct({ createdAt: Schema.String, note: Note }));

const Reaction = Schema.Struct({ createdAt: Schema.String, type: OptionalText, note: Note });

export const Reactions = Schema.Array(Reaction);

const Followee = User.pipe(Schema.NullOr, Schema.optional);

export const Following = Schema.Array(
  Schema.Struct({ createdAt: Schema.String, followee: Followee }),
);

export const Me = Schema.Struct({ id: Schema.String });

export const Request = Schema.Struct({ limit: Schema.Int, userId: Schema.optional(Schema.String) });

export type MisskeyNote = typeof Note.Type;

export type MisskeyUser = typeof User.Type;
