import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullHatena } from "./pull.server";

const hatena: Provider = {
  id: "hatena",
  name: "はてなブックマーク",
  methods: [
    {
      id: "user",
      label: "はてな ID を入れる",
      howTo:
        "b.hatena.ne.jp/<はてな ID>/bookmark を開いて、URL の <はてな ID> の部分を入れる。ブックマークを非公開にしていると読めない",
      fields: [{ name: FIELD.user, label: "はてな ID", secret: false, optional: false }],
      renews: false,
    },
  ],
  pull: pullHatena,
  renew: Effect.succeed,
};

export { hatena };
