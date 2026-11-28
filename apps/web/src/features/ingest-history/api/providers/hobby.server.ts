import type { Provider } from "#/features/ingest-history/model/provider";

import { anilist } from "./anilist/index.server.ts";
import { annict } from "./annict/index.server.ts";
import { myanimelist } from "./myanimelist/index.server.ts";
import { pixiv } from "./pixiv/index.server.ts";
import { playstation } from "./playstation/index.server.ts";
import { steam } from "./steam/index.server.ts";
import { vrchat } from "./vrchat/index.server.ts";
import { xbox } from "./xbox/index.server.ts";

export const HOBBY_PROVIDERS = {
  anilist,
  annict,
  myanimelist,
  pixiv,
  playstation,
  steam,
  vrchat,
  xbox,
} as const satisfies Readonly<Record<string, Provider>>;
