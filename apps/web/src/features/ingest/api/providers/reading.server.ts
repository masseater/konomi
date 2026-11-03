import type { Provider } from "#/features/ingest/model/provider";

import { kindle } from "./kindle/index.server";
import { openlibrary } from "./openlibrary/index.server";

const READING_PROVIDERS = {
  kindle,
  openlibrary,
} as const satisfies Readonly<Record<string, Provider>>;

export { READING_PROVIDERS };
