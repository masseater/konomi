import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullRaindrop } from "./pull.server";

const raindrop: Provider = {
  id: "raindrop",
  name: "Raindrop.io",
  methods: [
    {
      id: "token",
      label: "テストトークンを貼る",
      howTo:
        "app.raindrop.io/settings/integrations でアプリを作り、そのアプリの「テストトークンを作る」で出たトークンを貼る",
      fields: [{ name: FIELD.token, label: "テストトークン", secret: true, optional: false }],
      renews: false,
    },
  ],
  pull: pullRaindrop,
  renew: Effect.succeed,
};

export { raindrop };
