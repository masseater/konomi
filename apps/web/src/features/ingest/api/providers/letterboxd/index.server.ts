import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullLetterboxd } from "./pull.server";

const letterboxd: Provider = {
  id: "letterboxd",
  name: "Letterboxd",
  methods: [
    {
      id: "user",
      label: "ユーザー名を入れる",
      howTo:
        "letterboxd.com/<ユーザー名>/ の <ユーザー名> の部分を入れる。日記の RSS に出る最新の 100 件を読む",
      fields: [{ name: FIELD.user, label: "ユーザー名", secret: false, optional: false }],
      renews: false,
    },
  ],
  pull: pullLetterboxd,
  renew: Effect.succeed,
};

export { letterboxd };
