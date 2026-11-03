import { refreshDiscovered } from "#/features/ingest/api/providers/discovered-oauth.server";
import type { Authorization, Provider } from "#/features/ingest/model/provider";

import { ORIGIN, RESOURCE } from "./api";
import { pullTwilog } from "./pull.server";

const DISCOVERY = {
  issuer: ORIGIN,
  registration: `${ORIGIN}/register`,
  resource: RESOURCE,
} as const;

const AUTHORIZATION: Authorization = {
  authorizeUrl: `${ORIGIN}/authorize`,
  tokenUrl: `${ORIGIN}/token`,
  scopes: ["twilog.read", "offline_access"],
  params: {},
  discovery: DISCOVERY,
};

const twilog: Provider = {
  id: "twilog",
  name: "X（twilog）",
  methods: [
    {
      id: "oauth",
      label: "twilog の MCP で許可する",
      howTo:
        "twilog に X のアカウントを登録しておく。何も入れずに保存してから許可すると、いいねとブックマークを twilog の公式 MCP から読む",
      fields: [],
      renews: true,
      authorization: AUTHORIZATION,
    },
  ],
  pull: pullTwilog,
  renew: refreshDiscovered(DISCOVERY),
};

export { twilog };
