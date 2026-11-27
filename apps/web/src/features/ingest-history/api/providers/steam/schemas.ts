import { Schema } from "effect";

const Game = Schema.Struct({
  appid: Schema.Int,
  name: Schema.String.pipe(Schema.NullOr, Schema.optional),
  playtime_forever: Schema.Int.pipe(Schema.NullOr, Schema.optional),
  rtime_last_played: Schema.Int.pipe(Schema.NullOr, Schema.optional),
});

const Games = Game.pipe(Schema.Array, Schema.NullOr, Schema.optional);

export const OwnedGames = Schema.Struct({ response: Schema.Struct({ games: Games }) });

export type SteamGame = typeof Game.Type;
