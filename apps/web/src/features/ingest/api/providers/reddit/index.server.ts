import { CLIENT_FIELDS, refreshAccess } from "#/features/ingest/api/providers/oauth.server";
import type { Authorization, Provider } from "#/features/ingest/model/provider";

import { WEB } from "./api";
import { pullReddit } from "./pull.server";

const AUTHORIZATION: Authorization = {
  authorizeUrl: `${WEB}/api/v1/authorize`,
  tokenUrl: `${WEB}/api/v1/access_token`,
  scopes: ["identity", "history"],
  params: { duration: "permanent" },
};

const reddit: Provider = {
  id: "reddit",
  name: "Reddit",
  methods: [
    {
      id: "oauth",
      label: "自分の Reddit アプリで許可する",
      howTo:
        "reddit.com/prefs/apps で種類が web app のアプリを作り、Client ID と Client Secret を保存してから許可する",
      fields: CLIENT_FIELDS,
      renews: true,
      authorization: AUTHORIZATION,
    },
  ],
  pull: pullReddit,
  renew: refreshAccess(AUTHORIZATION),
};

export { reddit };
