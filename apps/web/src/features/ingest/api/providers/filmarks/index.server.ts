import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullFilmarks } from "./pull.server";

const filmarks: Provider = {
  id: "filmarks",
  name: "Filmarks",
  methods: [
    {
      id: "user",
      label: "ユーザー ID を入れる",
      howTo:
        "filmarks.com/users/<ユーザー ID> の <ユーザー ID> の部分を入れる。公開している映画とドラマの Mark と、Clip（観たい）を読む",
      fields: [{ name: FIELD.user, label: "ユーザー ID", secret: false, optional: false }],
      renews: false,
    },
  ],
  pull: pullFilmarks,
  renew: Effect.succeed,
};

export { filmarks };
