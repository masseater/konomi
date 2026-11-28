import type { Provider } from "#/features/ingest-history/model/provider";

import { github } from "./github/index.server.ts";
import { hatena } from "./hatena/index.server.ts";
import { pinterest } from "./pinterest/index.server.ts";
import { qiita } from "./qiita/index.server.ts";
import { raindrop } from "./raindrop/index.server.ts";

export const WEB_PROVIDERS = {
  github,
  hatena,
  pinterest,
  qiita,
  raindrop,
} as const satisfies Readonly<Record<string, Provider>>;
