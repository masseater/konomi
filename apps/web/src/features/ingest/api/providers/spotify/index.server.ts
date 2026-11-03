import { CLIENT_FIELDS, refreshAccess } from "#/features/ingest/api/providers/oauth.server";
import type { Authorization, Provider } from "#/features/ingest/model/provider";

import { pullSpotify } from "./pull.server";

const AUTHORIZATION: Authorization = {
  authorizeUrl: "https://accounts.spotify.com/authorize",
  tokenUrl: "https://accounts.spotify.com/api/token",
  scopes: [
    "user-read-recently-played",
    "user-library-read",
    "user-follow-read",
    "playlist-read-private",
    "playlist-read-collaborative",
  ],
  params: {},
};

const spotify: Provider = {
  id: "spotify",
  name: "Spotify",
  methods: [
    {
      id: "oauth",
      label: "自分の Spotify アプリで許可する",
      howTo:
        "developer.spotify.com/dashboard で Web API のアプリを作り、Client ID と Client Secret を保存してから許可する。開発モードのアプリは持ち主の Premium が要る",
      fields: CLIENT_FIELDS,
      renews: true,
      authorization: AUTHORIZATION,
    },
  ],
  pull: pullSpotify,
  renew: refreshAccess(AUTHORIZATION),
};

export { spotify };
