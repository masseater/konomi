import { fileImportProvider } from "#/features/ingest/api/providers/file-import.server";

import { KINDLE_IMPORTS } from "./imports.server";

const kindle = fileImportProvider({ id: "kindle", name: "Kindle", imports: KINDLE_IMPORTS });

export { kindle };
