import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullAnnict } from "./pull.server";

const annict: Provider = {
  id: "annict",
  name: "Annict",
  methods: [
    {
      id: "token",
      label: "個人用アクセストークンを貼る",
      howTo:
        "annict.com の設定のアプリケーションにある個人用アクセストークンで、読み込みだけを許可したトークンを作って貼る",
      fields: [
        { name: FIELD.token, label: "個人用アクセストークン", secret: true, optional: false },
      ],
      renews: false,
    },
  ],
  pull: pullAnnict,
  renew: Effect.succeed,
};

export { annict };
