import { fileImportProvider } from "#/features/ingest/api/providers/file-import.server";

import { NETFLIX_IMPORTS } from "./imports.server";

const netflix = fileImportProvider({ id: "netflix", name: "Netflix", imports: NETFLIX_IMPORTS });

export { netflix };
