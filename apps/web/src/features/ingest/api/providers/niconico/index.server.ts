import type { Provider } from "#/features/ingest/model/provider";

import { renewNiconico } from "./login.server";
import { pullNiconico } from "./pull.server";

const niconico: Provider = {
  id: "niconico",
  name: "ニコニコ動画",
  methods: [
    {
      id: "password",
      label: "メールアドレスとパスワードでログインする",
      howTo:
        "ログインが切れるたびに konomi がログインし直す。二段階認証を認証アプリで使っているなら、設定し直すときに表示されるシークレット（英大文字と数字の列）も貼る",
      fields: [
        { name: "mail", label: "メールアドレスか電話番号", secret: false, optional: false },
        { name: "password", label: "パスワード", secret: true, optional: false },
        { name: "totpSecret", label: "認証アプリのシークレット", secret: true, optional: true },
      ],
      renews: true,
    },
    {
      id: "session",
      label: "user_session を貼る",
      howTo:
        "ブラウザで nicovideo.jp にログインし、開発者ツールの Cookie にある user_session の値を貼る。切れたら貼り直す",
      fields: [{ name: "userSession", label: "user_session の値", secret: true, optional: false }],
      renews: false,
    },
  ],
  pull: pullNiconico,
  renew: renewNiconico,
};

export { niconico };
