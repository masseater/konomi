import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, FIELD } from "./api";
import { OwnedGames } from "./schemas";
import { gamesObservedAt } from "./subjects";

const ownedGamesUrl = ({
  apiKey,
  steamId,
}: Readonly<{ apiKey: string; steamId: string }>): string => {
  const url = new URL(`${API}/IPlayerService/GetOwnedGames/v1/`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");
  url.searchParams.set("format", "json");
  return url.toString();
};

const pullSteam = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* steam() {
    const account = yield* Effect.all({
      apiKey: requireField(credential, FIELD.apiKey),
      steamId: requireField(credential, FIELD.steamId),
    });
    const fetchedAt = yield* Clock.currentTimeMillis;
    const { response } = yield* fetchJson({
      url: ownedGamesUrl(account),
      headers: {},
      schema: OwnedGames,
    });
    const games = pipe(
      Option.fromNullishOr(response.games),
      Option.getOrElse(() => Arr.empty()),
    );
    return { observations: gamesObservedAt(fetchedAt)(games), cursor };
  }).pipe(Effect.withSpan("steam.pull"));

export { pullSteam };
