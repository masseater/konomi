import type { Provider } from "#/features/ingest/model/provider";

import { niconico } from "./niconico/index.server";
import { trakt } from "./trakt/index.server";
import { youtube } from "./youtube/index.server";

const VIDEO_PROVIDERS = { niconico, trakt, youtube } as const satisfies Readonly<
  Record<string, Provider>
>;

export { VIDEO_PROVIDERS };
