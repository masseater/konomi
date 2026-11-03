import type { Provider } from "#/features/ingest/model/provider";

import { bluesky } from "./bluesky/index.server";
import { twitch } from "./twitch/index.server";

const SOCIAL_PROVIDERS = { bluesky, twitch } as const satisfies Readonly<Record<string, Provider>>;

export { SOCIAL_PROVIDERS };
