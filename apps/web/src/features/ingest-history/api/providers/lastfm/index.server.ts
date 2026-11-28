import { Effect } from "effect";

import type { Provider } from "#/features/ingest-history/model/provider";

import { FIELD } from "./api.ts";
import { pullLastfm } from "./pull.server.ts";

export const lastfm: Provider = {
  id: "lastfm",
  name: "Last.fm",
  methods: [
    {
      id: "apiKey",
      label: "ユーザー名と API キーを貼る",
      howTo:
        "last.fm/api/account/create で API アカウントを作り、API key を貼る。Spotify や Apple Music の再生を Last.fm に scrobble しておくと、時刻つきの再生として取り込める",
      fields: [
        { name: FIELD.user, label: "Last.fm のユーザー名", secret: false, optional: false },
        { name: FIELD.apiKey, label: "API key", secret: true, optional: false },
      ],
      renews: false,
    },
  ],
  pull: pullLastfm,
  renew: Effect.succeed,
};
