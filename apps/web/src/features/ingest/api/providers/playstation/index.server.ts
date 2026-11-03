import type { Provider } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { pullPlaystation } from "./pull.server";
import { renewPlaystation } from "./tokens.server";

const playstation: Provider = {
  id: "playstation",
  name: "PlayStation",
  methods: [
    {
      id: "npsso",
      label: "NPSSO を貼る",
      howTo:
        "playstation.com にログインした状態で ca.account.sony.com/api/v1/ssocookie を開き、表示された npsso の値を貼る。PlayStation App と同じ非公開の API を psn-api で読む。許可が切れて取り直せなくなったら NPSSO を貼り直す",
      fields: [{ name: FIELD.npsso, label: "NPSSO", secret: true, optional: false }],
      renews: true,
    },
  ],
  pull: pullPlaystation,
  renew: renewPlaystation,
};

export { playstation };
