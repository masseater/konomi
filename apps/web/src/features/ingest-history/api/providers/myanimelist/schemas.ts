import { Schema } from "effect";

const Genre = Schema.Struct({ name: Schema.String });

const Genres = Schema.optional(Schema.NullOr(Schema.Array(Genre)));

const Season = Schema.optional(Schema.NullOr(Schema.Struct({ year: Schema.Int })));

const Node = Schema.Struct({
  id: Schema.Int,
  title: Schema.String,
  genres: Genres,
  start_season: Season,
});

const ListStatus = Schema.Struct({
  status: Schema.optional(Schema.NullOr(Schema.String)),
  score: Schema.optional(Schema.NullOr(Schema.Int)),
  updated_at: Schema.optional(Schema.NullOr(Schema.String)),
});

const Entry = Schema.Struct({ node: Node, list_status: ListStatus });

const Next = Schema.Struct({ next: Schema.optional(Schema.NullOr(Schema.String)) });

const Paging = Schema.optional(Schema.NullOr(Next));

const UserList = Schema.Struct({ data: Schema.Array(Entry), paging: Paging });

type MalEntry = typeof Entry.Type;

type MalGenre = typeof Genre.Type;

export type { MalEntry, MalGenre };
export { UserList };
