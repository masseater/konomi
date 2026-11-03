import { CLIENT_FIELDS, refreshAccess } from "#/features/ingest/api/providers/oauth.server";
import type { Authorization, Provider } from "#/features/ingest/model/provider";

import { HISTORY_FIELD } from "./api";
import { pullYoutube } from "./pull.server";

const GOOGLE_OAUTH_ORIGIN = "https://oauth2.googleapis.com";

const AUTHORIZATION: Authorization = {
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: `${GOOGLE_OAUTH_ORIGIN}/token`,
  scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
  params: { access_type: "offline", prompt: "consent" },
};

const youtube: Provider = {
  id: "youtube",
  name: "YouTube",
  methods: [
    {
      id: "oauth",
      label: "自分の Google Cloud のアプリで許可する",
      howTo:
        "Google Cloud で YouTube Data API v3 を有効にし、OAuth クライアント（ウェブ アプリケーション）を作って Client ID と Client Secret を保存してから許可する。同意画面の公開ステータスを「本番環境」にしないと 7 日で許可が切れる。視聴履歴は公式 API に無いので、取りたいときだけ www.youtube.com の Cookie ヘッダーの値を貼る。非公式の読み方なので、アカウントが止められる恐れがある",
      fields: [
        ...CLIENT_FIELDS,
        { name: HISTORY_FIELD, label: "視聴履歴用の Cookie（任意）", secret: true, optional: true },
      ],
      renews: true,
      authorization: AUTHORIZATION,
    },
  ],
  pull: pullYoutube,
  renew: refreshAccess(AUTHORIZATION),
};

export { youtube };
