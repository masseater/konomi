import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullGitHub } from "./pull.server";

const github: Provider = {
  id: "github",
  name: "GitHub",
  methods: [
    {
      id: "user",
      label: "ユーザー名を入れる",
      howTo:
        "スターとフォローは公開の情報なので、ユーザー名だけで読める。トークンを入れると、読める回数の上限が上がる",
      fields: [
        { name: FIELD.user, label: "ユーザー名", secret: false, optional: false },
        { name: FIELD.token, label: "個人用アクセストークン", secret: true, optional: true },
      ],
      renews: false,
    },
  ],
  pull: pullGitHub,
  renew: Effect.succeed,
};

export { github };
