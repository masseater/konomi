import type { Provider } from "#/features/ingest/model/provider";

import { github } from "./github/index.server";
import { hatena } from "./hatena/index.server";
import { pinterest } from "./pinterest/index.server";
import { qiita } from "./qiita/index.server";
import { raindrop } from "./raindrop/index.server";

const WEB_PROVIDERS = { github, hatena, pinterest, qiita, raindrop } as const satisfies Readonly<
  Record<string, Provider>
>;

export { WEB_PROVIDERS };
