import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullListenbrainz } from "./pull.server";

const listenbrainz: Provider = {
  id: "listenbrainz",
  name: "ListenBrainz",
  methods: [
    {
      id: "user",
      label: "ユーザー名を入れる",
      howTo:
        "listenbrainz.org/user/<ユーザー名>/ の <ユーザー名> の部分を入れる。聴いた曲と、ハートを付けた曲を公開の API で読む",
      fields: [{ name: FIELD.user, label: "ユーザー名", secret: false, optional: false }],
      renews: false,
    },
  ],
  pull: pullListenbrainz,
  renew: Effect.succeed,
};

export { listenbrainz };
