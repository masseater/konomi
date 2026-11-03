import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullBluesky } from "./pull.server";

const bluesky: Provider = {
  id: "bluesky",
  name: "Bluesky",
  methods: [
    {
      id: "appPassword",
      label: "ハンドルとアプリパスワードを貼る",
      howTo:
        "bsky.app の設定のプライバシーとセキュリティにあるアプリパスワードで新しいパスワードを作って貼る。普段のパスワードは使わない",
      fields: [
        {
          name: FIELD.identifier,
          label: "ハンドル（例: name.bsky.social）",
          secret: false,
          optional: false,
        },
        { name: FIELD.appPassword, label: "アプリパスワード", secret: true, optional: false },
      ],
      renews: false,
    },
  ],
  pull: pullBluesky,
  renew: Effect.succeed,
};

export { bluesky };
