import type { Provider } from "#/features/ingest/model/provider";

import { github } from "./github/index.server";
import { hatena } from "./hatena/index.server";
import { pinterest } from "./pinterest/index.server";
import { raindrop } from "./raindrop/index.server";

const WEB_PROVIDERS = { github, hatena, pinterest, raindrop } as const satisfies Readonly<
  Record<string, Provider>
>;

export { WEB_PROVIDERS };
