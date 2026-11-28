import type { Provider } from "#/features/ingest-history/model/provider";

import { bluesky } from "./bluesky/index.server.ts";
import { mastodon } from "./mastodon/index.server.ts";
import { misskey } from "./misskey/index.server.ts";
import { reddit } from "./reddit/index.server.ts";
import { twilog } from "./twilog/index.server.ts";
import { twitch } from "./twitch/index.server.ts";

export const SOCIAL_PROVIDERS = {
  bluesky,
  mastodon,
  misskey,
  reddit,
  twilog,
  twitch,
} as const satisfies Readonly<Record<string, Provider>>;
