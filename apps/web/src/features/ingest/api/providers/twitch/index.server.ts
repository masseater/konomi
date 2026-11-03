import { CLIENT_FIELDS, refreshAccess } from "#/features/ingest/api/providers/oauth.server";
import type { Authorization, Provider } from "#/features/ingest/model/provider";

import { pullTwitch } from "./pull.server";

const AUTHORIZATION: Authorization = {
  authorizeUrl: "https://id.twitch.tv/oauth2/authorize",
  tokenUrl: "https://id.twitch.tv/oauth2/token",
  scopes: ["user:read:follows"],
  params: {},
  clientAuthentication: "body",
};

const twitch: Provider = {
  id: "twitch",
  name: "Twitch",
  methods: [
    {
      id: "oauth",
      label: "自分の Twitch アプリで許可する",
      howTo:
        "dev.twitch.tv/console で種類が Confidential のアプリを作り、Client ID と Client Secret を保存してから許可する",
      fields: CLIENT_FIELDS,
      renews: true,
      authorization: AUTHORIZATION,
    },
  ],
  pull: pullTwitch,
  renew: refreshAccess(AUTHORIZATION),
};

export { twitch };
