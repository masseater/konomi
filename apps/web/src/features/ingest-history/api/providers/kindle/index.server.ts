import { fileImportProvider } from "#/features/ingest-history/api/providers/file-import.server";

import { KINDLE_IMPORTS } from "./imports.server";

export const kindle = fileImportProvider({ id: "kindle", name: "Kindle", imports: KINDLE_IMPORTS });
