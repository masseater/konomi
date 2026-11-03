import type { Provider } from "#/features/ingest/model/provider";

import { appleMusic } from "./apple-music/index.server";
import { lastfm } from "./lastfm/index.server";
import { soundcloud } from "./soundcloud/index.server";
import { spotify } from "./spotify/index.server";

const MUSIC_PROVIDERS = {
  "apple-music": appleMusic,
  lastfm,
  soundcloud,
  spotify,
} as const satisfies Readonly<Record<string, Provider>>;

export { MUSIC_PROVIDERS };
