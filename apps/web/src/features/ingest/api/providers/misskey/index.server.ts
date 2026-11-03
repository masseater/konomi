import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullMisskey } from "./pull.server";

const misskey: Provider = {
  id: "misskey",
  name: "Misskey",
  methods: [
    {
      id: "accessToken",
      label: "サーバーの URL とアクセストークンを貼る",
      howTo:
        "自分のサーバーの「設定 → API」で、アカウントの情報・お気に入り・リアクション・フォローを見る権限を付けたトークンを作って貼る",
      fields: [
        { name: FIELD.instance, label: "サーバーの URL", secret: false, optional: false },
        { name: FIELD.accessToken, label: "アクセストークン", secret: true, optional: false },
      ],
      renews: false,
    },
  ],
  pull: pullMisskey,
  renew: Effect.succeed,
};

export { misskey };
