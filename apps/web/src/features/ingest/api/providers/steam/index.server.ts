import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullSteam } from "./pull.server";

const steam: Provider = {
  id: "steam",
  name: "Steam",
  methods: [
    {
      id: "apiKey",
      label: "Web API キーと SteamID を貼る",
      howTo:
        "steamcommunity.com/dev/apikey で Web API キーを作り、プロフィールの URL などから 17 桁の SteamID を貼る。プロフィールのゲームの詳細を非公開にしていると読めない",
      fields: [
        { name: FIELD.apiKey, label: "Web API キー", secret: true, optional: false },
        { name: FIELD.steamId, label: "SteamID（17 桁）", secret: false, optional: false },
      ],
      renews: false,
    },
  ],
  pull: pullSteam,
  renew: Effect.succeed,
};

export { steam };
