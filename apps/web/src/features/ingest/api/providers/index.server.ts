import type { Provider } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

import { appleMusic } from "./apple-music/index.server";
import { niconico } from "./niconico/index.server";
import { soundcloud } from "./soundcloud/index.server";
import { spotify } from "./spotify/index.server";
import { youtube } from "./youtube/index.server";

const PROVIDERS: Readonly<Record<ProviderId, Provider>> = {
  "apple-music": appleMusic,
  niconico,
  soundcloud,
  spotify,
  youtube,
};

export { PROVIDERS };
