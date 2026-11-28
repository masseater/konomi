import type { Provider } from "#/features/ingest-history/model/provider";

import { appleMusic } from "./apple-music/index.server.ts";
import { lastfm } from "./lastfm/index.server.ts";
import { listenbrainz } from "./listenbrainz/index.server.ts";
import { soundcloud } from "./soundcloud/index.server.ts";
import { spotify } from "./spotify/index.server.ts";
import { vocadb } from "./vocadb/index.server.ts";

export const MUSIC_PROVIDERS = {
  "apple-music": appleMusic,
  lastfm,
  listenbrainz,
  soundcloud,
  spotify,
  vocadb,
} as const satisfies Readonly<Record<string, Provider>>;
