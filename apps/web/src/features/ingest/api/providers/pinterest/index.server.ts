import { CLIENT_FIELDS, refreshAccess } from "#/features/ingest/api/providers/oauth.server";
import type { Authorization, Provider } from "#/features/ingest/model/provider";

import { pullPinterest } from "./pull.server";

const AUTHORIZATION: Authorization = {
  authorizeUrl: "https://www.pinterest.com/oauth/",
  tokenUrl: "https://api.pinterest.com/v5/oauth/token",
  scopes: ["user_accounts:read", "boards:read", "pins:read"],
  params: {},
};

const pinterest: Provider = {
  id: "pinterest",
  name: "Pinterest",
  methods: [
    {
      id: "oauth",
      label: "自分の Pinterest アプリで許可する",
      howTo:
        "developers.pinterest.com/apps でアプリを作り、App ID を Client ID に、App secret key を Client Secret に保存してから許可する",
      fields: CLIENT_FIELDS,
      renews: true,
      authorization: AUTHORIZATION,
    },
  ],
  pull: pullPinterest,
  renew: refreshAccess(AUTHORIZATION),
};

export { pinterest };
