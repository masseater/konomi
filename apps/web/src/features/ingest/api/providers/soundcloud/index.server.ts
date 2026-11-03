import { Effect } from "effect";

import type { Credential } from "#/entities/connection";
import type { Provider, ProviderError } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { scrapeClientId } from "./client-id.server";
import { pullSoundcloud } from "./pull.server";

const renewClientId = (credential: Credential): Effect.Effect<Credential, ProviderError> =>
  scrapeClientId.pipe(
    Effect.map((clientId) => ({
      method: credential.method,
      fields: { ...credential.fields, [FIELD.clientId]: clientId },
    })),
  );

const soundcloud: Provider = {
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

export { soundcloud };
