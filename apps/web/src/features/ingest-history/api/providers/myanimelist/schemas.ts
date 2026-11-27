import { Schema } from "effect";

const Genre = Schema.Struct({ name: Schema.String });

const Genres = Genre.pipe(Schema.Array, Schema.NullOr, Schema.optional);

const Season = Schema.Struct({ year: Schema.Int }).pipe(Schema.NullOr, Schema.optional);

const Node = Schema.Struct({
  id: Schema.Int,
  title: Schema.String,
  genres: Genres,
  start_season: Season,
});

const ListStatus = Schema.Struct({
  status: Schema.String.pipe(Schema.NullOr, Schema.optional),
  score: Schema.Int.pipe(Schema.NullOr, Schema.optional),
  updated_at: Schema.String.pipe(Schema.NullOr, Schema.optional),
});

const Entry = Schema.Struct({ node: Node, list_status: ListStatus });

const Next = Schema.Struct({ next: Schema.String.pipe(Schema.NullOr, Schema.optional) });

const Paging = Next.pipe(Schema.NullOr, Schema.optional);

export const UserList = Schema.Struct({ data: Schema.Array(Entry), paging: Paging });

export type MalEntry = typeof Entry.Type;

export type MalGenre = typeof Genre.Type;
