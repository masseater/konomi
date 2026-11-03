import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullOpenlibrary } from "./pull.server";

const openlibrary: Provider = {
  id: "openlibrary",
  name: "Open Library",
  methods: [
    {
      id: "user",
      label: "ユーザー名を入れる",
      howTo:
        "openlibrary.org/people/<ユーザー名> の <ユーザー名> の部分を入れる。読書記録を公開にしておくと、読んだ・読んでいる・読みたい本を読める",
      fields: [{ name: FIELD.user, label: "ユーザー名", secret: false, optional: false }],
      renews: false,
    },
  ],
  pull: pullOpenlibrary,
  renew: Effect.succeed,
};

export { openlibrary };
