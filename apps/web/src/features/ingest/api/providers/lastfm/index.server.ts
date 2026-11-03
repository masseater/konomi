import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullLastfm } from "./pull.server";

const lastfm: Provider = {
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

export { lastfm };
