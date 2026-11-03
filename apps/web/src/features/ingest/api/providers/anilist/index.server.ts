import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullAniList } from "./pull.server";

const anilist: Provider = {
  id: "anilist",
  name: "AniList",
  methods: [
    {
      id: "user",
      label: "ユーザー名を入れる",
      howTo:
        "アニメとマンガのリストは公開の情報なので、ユーザー名だけで読める。設定でリストを非公開にしていると読めない",
      fields: [{ name: FIELD.user, label: "ユーザー名", secret: false, optional: false }],
      renews: false,
    },
  ],
  pull: pullAniList,
  renew: Effect.succeed,
};

export { anilist };
