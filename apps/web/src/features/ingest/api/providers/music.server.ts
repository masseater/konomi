import type { Provider } from "#/features/ingest/model/provider";

import { appleMusic } from "./apple-music/index.server";
import { lastfm } from "./lastfm/index.server";
import { listenbrainz } from "./listenbrainz/index.server";
import { soundcloud } from "./soundcloud/index.server";
import { spotify } from "./spotify/index.server";
import { vocadb } from "./vocadb/index.server";

const MUSIC_PROVIDERS = {
  "apple-music": appleMusic,
  lastfm,
  listenbrainz,
  soundcloud,
  spotify,
  vocadb,
} as const satisfies Readonly<Record<string, Provider>>;

export { MUSIC_PROVIDERS };
