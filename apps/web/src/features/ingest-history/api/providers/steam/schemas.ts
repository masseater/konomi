import { Schema } from "effect";

const Game = Schema.Struct({
  appid: Schema.Int,
  name: Schema.optional(Schema.NullOr(Schema.String)),
  playtime_forever: Schema.optional(Schema.NullOr(Schema.Int)),
  rtime_last_played: Schema.optional(Schema.NullOr(Schema.Int)),
});

const Games = Schema.optional(Schema.NullOr(Schema.Array(Game)));

const OwnedGames = Schema.Struct({ response: Schema.Struct({ games: Games }) });

type SteamGame = typeof Game.Type;

export type { SteamGame };
export { OwnedGames };
