import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullAppleMusic } from "./pull.server";

const appleMusic: Provider = {
  id: "apple-music",
  name: "Apple Music",
  methods: [
    {
      id: "musickit",
      label: "自分の MusicKit の鍵で許可する",
      howTo:
        "Apple Developer Program の Certificates, Identifiers & Profiles で Media Services（MusicKit）の鍵を作り、Team ID・Key ID・.p8 の中身を保存してから、Apple Music の許可の画面で Apple ID の許可を取る。許可はおよそ 6 か月で切れるので、そのときは同じ画面で取り直す",
      fields: [
        { name: FIELD.teamId, label: "Team ID", secret: false, optional: false },
        { name: FIELD.keyId, label: "Key ID", secret: false, optional: false },
        { name: FIELD.privateKey, label: "秘密鍵（.p8 の中身）", secret: true, optional: false },
      ],
      renews: false,
      authorizePath: "/connect/apple-music",
    },
  ],
  pull: pullAppleMusic,
  renew: Effect.succeed,
};

export { appleMusic };
