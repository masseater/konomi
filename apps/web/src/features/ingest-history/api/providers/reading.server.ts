import type { Provider } from "#/features/ingest-history/model/provider";

import { kindle } from "./kindle/index.server";
import { openlibrary } from "./openlibrary/index.server";

export const READING_PROVIDERS = {
  kindle,
  openlibrary,
} as const satisfies Readonly<Record<string, Provider>>;
