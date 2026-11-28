import { Effect } from "effect";

import type { Provider } from "#/features/ingest-history/model/provider";

import { FIELD } from "./api.ts";
import { pullVocaDb } from "./pull.server.ts";

export const vocadb: Provider = {
  id: "vocadb",
  name: "VocaDB",
  methods: [
    {
      id: "user",
      label: "ユーザー名を入れる",
      howTo: "評価した曲は公開の情報なので、VocaDB のユーザー名だけで読める",
      fields: [{ name: FIELD.user, label: "ユーザー名", secret: false, optional: false }],
      renews: false,
    },
  ],
  pull: pullVocaDb,
  renew: Effect.succeed,
};
