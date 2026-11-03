import type { Provider } from "#/features/ingest/model/provider";

import { filmarks } from "./filmarks/index.server";
import { letterboxd } from "./letterboxd/index.server";
import { netflix } from "./netflix/index.server";
import { niconico } from "./niconico/index.server";
import { primeVideo } from "./prime-video/index.server";
import { trakt } from "./trakt/index.server";
import { youtube } from "./youtube/index.server";

const VIDEO_PROVIDERS = {
  filmarks,
  letterboxd,
  netflix,
  niconico,
  "prime-video": primeVideo,
  trakt,
  youtube,
} as const satisfies Readonly<Record<string, Provider>>;

export { VIDEO_PROVIDERS };
