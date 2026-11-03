import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullMastodon } from "./pull.server";

const mastodon: Provider = {
  id: "mastodon",
  name: "Mastodon",
  methods: [
    {
      id: "accessToken",
      label: "サーバーの URL とアクセストークンを貼る",
      howTo:
        "自分のサーバーの「設定 → 開発」で、read:favourites・read:bookmarks・read:follows・read:accounts の権限を付けたアプリを作り、アクセストークンを貼る",
      fields: [
        { name: FIELD.instance, label: "サーバーの URL", secret: false, optional: false },
        { name: FIELD.accessToken, label: "アクセストークン", secret: true, optional: false },
      ],
      renews: false,
    },
  ],
  pull: pullMastodon,
  renew: Effect.succeed,
};

export { mastodon };
