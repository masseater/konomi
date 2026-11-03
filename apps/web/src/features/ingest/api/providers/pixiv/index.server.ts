import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullPixiv } from "./pull.server";

const pixiv: Provider = {
  id: "pixiv",
  name: "pixiv",
  methods: [
    {
      id: "refresh-token",
      label: "refresh token を貼る",
      howTo:
        "pixiv のスマホアプリと同じ方法でログインして取った refresh token を貼る（gppt などの道具で取れる）。ブックマークしたイラストと小説、フォローしているユーザーを、アプリが使う非公開の API で読む。refresh token は取り込みのたびに konomi が新しいものに入れ替える",
      fields: [{ name: FIELD.refreshToken, label: "refresh token", secret: true, optional: false }],
      renews: false,
    },
  ],
  pull: pullPixiv,
  renew: Effect.succeed,
};

export { pixiv };
