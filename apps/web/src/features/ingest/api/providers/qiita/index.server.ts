import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullQiita } from "./pull.server";

const qiita: Provider = {
  id: "qiita",
  name: "Qiita",
  methods: [
    {
      id: "user",
      label: "ユーザー名を入れる",
      howTo:
        "qiita.com/<ユーザー名> の <ユーザー名> の部分を入れる。ストックした記事を公開の API で読む。トークンが無いと Cloudflare の IP ごとに 1 時間 60 回までなので、qiita.com/settings/tokens/new で read_qiita のトークンを作って貼っておくと止まりにくい",
      fields: [
        { name: FIELD.user, label: "ユーザー名", secret: false, optional: false },
        { name: FIELD.token, label: "アクセストークン", secret: true, optional: true },
      ],
      renews: false,
    },
  ],
  pull: pullQiita,
  renew: Effect.succeed,
};

export { qiita };
