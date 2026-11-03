import type { Provider } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

import { niconico } from "./niconico/index.server";
import { spotify } from "./spotify/index.server";
import { youtube } from "./youtube/index.server";

const PROVIDERS: Readonly<Record<ProviderId, Provider>> = { niconico, spotify, youtube };

export { PROVIDERS };
