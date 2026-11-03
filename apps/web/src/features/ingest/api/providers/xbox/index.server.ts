import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullXbox } from "./pull.server";

const xbox: Provider = {
  id: "xbox",
  name: "Xbox",
  methods: [
    {
      id: "openxbl",
      label: "OpenXBL の API キーを入れる",
      howTo:
        "xbl.io に Microsoft アカウントでログインし、ダッシュボードで作った API キーを入れる。遊んだゲームと最後に遊んだ日時、フレンドを、OpenXBL を通して読む",
      fields: [{ name: FIELD.apiKey, label: "API キー", secret: true, optional: false }],
      renews: false,
    },
  ],
  pull: pullXbox,
  renew: Effect.succeed,
};

export { xbox };
