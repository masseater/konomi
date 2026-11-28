import type { Provider } from "#/features/ingest-history/model/provider";

import { filmarks } from "./filmarks/index.server.ts";
import { letterboxd } from "./letterboxd/index.server.ts";
import { netflix } from "./netflix/index.server.ts";
import { niconico } from "./niconico/index.server.ts";
import { primeVideo } from "./prime-video/index.server.ts";
import { trakt } from "./trakt/index.server.ts";
import { youtube } from "./youtube/index.server.ts";

export const VIDEO_PROVIDERS = {
  filmarks,
  letterboxd,
  netflix,
  niconico,
  "prime-video": primeVideo,
  trakt,
  youtube,
} as const satisfies Readonly<Record<string, Provider>>;
