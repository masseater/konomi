import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullVrchat } from "./pull.server";

const vrchat: Provider = {
  id: "vrchat",
  name: "VRChat",
  methods: [
    {
      id: "cookie",
      label: "auth の Cookie を貼る",
      howTo:
        "vrchat.com にログインしたブラウザの開発者ツールで、Cookie の auth の値を貼る。お気に入りのワールドとアバター、フレンドを、Web 版が使う API で読む。ログインが切れたら貼り直す",
      fields: [{ name: FIELD.auth, label: "auth", secret: true, optional: false }],
      renews: false,
    },
  ],
  pull: pullVrchat,
  renew: Effect.succeed,
};

export { vrchat };
