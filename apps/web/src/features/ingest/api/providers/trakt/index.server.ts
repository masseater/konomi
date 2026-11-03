import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullTrakt } from "./pull.server";

const trakt: Provider = {
  id: "trakt",
  name: "Trakt",
  methods: [
    {
      id: "clientId",
      label: "Client ID とユーザー名を貼る",
      howTo:
        "trakt.tv/oauth/applications でアプリを作り、Client ID を貼る。視聴履歴と評価を公開にしていれば、ユーザーの許可は要らない",
      fields: [
        { name: FIELD.user, label: "ユーザー名", secret: false, optional: false },
        { name: FIELD.clientId, label: "Client ID", secret: true, optional: false },
      ],
      renews: false,
    },
  ],
  pull: pullTrakt,
  renew: Effect.succeed,
};

export { trakt };
