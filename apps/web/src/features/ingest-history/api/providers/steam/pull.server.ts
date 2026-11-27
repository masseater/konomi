import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireFields } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";

import { API, FIELD } from "./api";
import { OwnedGames } from "./schemas";
import { gamesObservedAt } from "./subjects";

const ownedGamesUrl = ({
  apiKey,
  steamId,
}: Readonly<{ apiKey: string; steamId: string }>): string =>
  urlWith(`${API}/IPlayerService/GetOwnedGames/v1/`, {
    key: apiKey,
    steamid: steamId,
    include_appinfo: "1",
    include_played_free_games: "1",
    format: "json",
  });

export const pullSteam = pullOf({
  provider: "steam",
  cursor: "kept",
  observe: ({ credential, fetchedAt }) =>
    Effect.gen(function* steam() {
      const account = yield* requireFields(credential, {
        apiKey: FIELD.apiKey,
        steamId: FIELD.steamId,
      });
      const { response } = yield* fetchJson({
        url: ownedGamesUrl(account),
        headers: {},
        schema: OwnedGames,
      });
      const games = pipe(
        Option.fromNullishOr(response.games),
        Option.getOrElse(() => Arr.empty()),
      );
      return gamesObservedAt(fetchedAt)(games);
    }),
});
