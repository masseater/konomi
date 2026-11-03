import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullMyAnimeList } from "./pull.server";

const myanimelist: Provider = {
  id: "myanimelist",
  name: "MyAnimeList",
  methods: [
    {
      id: "clientId",
      label: "Client ID とユーザー名を貼る",
      howTo:
        "myanimelist.net/apiconfig で API のクライアントを作り、Client ID を貼る。アニメとマンガのリストは公開の情報なので、ユーザーの許可は要らない",
      fields: [
        { name: FIELD.user, label: "ユーザー名", secret: false, optional: false },
        { name: FIELD.clientId, label: "Client ID", secret: true, optional: false },
      ],
      renews: false,
    },
  ],
  pull: pullMyAnimeList,
  renew: Effect.succeed,
};

export { myanimelist };
