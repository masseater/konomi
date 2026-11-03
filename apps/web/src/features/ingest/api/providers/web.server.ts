import type { Provider } from "#/features/ingest/model/provider";

import { github } from "./github/index.server";

const WEB_PROVIDERS = { github } as const satisfies Readonly<Record<string, Provider>>;

export { WEB_PROVIDERS };
