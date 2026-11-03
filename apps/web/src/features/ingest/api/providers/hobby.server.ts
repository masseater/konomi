import type { Provider } from "#/features/ingest/model/provider";

import { anilist } from "./anilist/index.server";
import { annict } from "./annict/index.server";
import { myanimelist } from "./myanimelist/index.server";
import { steam } from "./steam/index.server";

const HOBBY_PROVIDERS = { anilist, annict, myanimelist, steam } as const satisfies Readonly<
  Record<string, Provider>
>;

export { HOBBY_PROVIDERS };
