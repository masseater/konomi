import { renewedField } from "#/features/ingest-history/api/providers/credential-field";
import type { Provider } from "#/features/ingest-history/model/provider";

import { FIELD } from "./api.ts";
import { scrapeClientId } from "./client-id.server.ts";
import { pullSoundcloud } from "./pull.server.ts";

const renewClientId = renewedField({
  field: FIELD.clientId,
  span: "soundcloud.renew",
  create: () => scrapeClientId,
});

export const soundcloud: Provider = {
  id: "soundcloud",
  name: "SoundCloud",
  methods: [
    {
      id: "token",
      label: "ログイン中の oauth_token を貼る",
      howTo:
        "soundcloud.com にログインした状態で、開発者ツールの Cookie から oauth_token の値を貼る。公開の API はアプリ登録に Artist Pro が要るので、Web 版が使う api-v2 を読む。client_id は soundcloud.com のスクリプトから自動で取り直す",
      fields: [{ name: FIELD.token, label: "oauth_token", secret: true, optional: false }],
      renews: true,
    },
  ],
  pull: pullSoundcloud,
  renew: renewClientId,
};
