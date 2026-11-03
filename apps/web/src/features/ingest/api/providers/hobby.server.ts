import type { Provider } from "#/features/ingest/model/provider";

import { annict } from "./annict/index.server";
import { steam } from "./steam/index.server";

const HOBBY_PROVIDERS = { annict, steam } as const satisfies Readonly<Record<string, Provider>>;

export { HOBBY_PROVIDERS };
