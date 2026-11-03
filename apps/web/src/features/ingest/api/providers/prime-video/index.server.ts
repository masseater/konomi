import { fileImportProvider } from "#/features/ingest/api/providers/file-import.server";

import { PRIME_VIDEO_IMPORTS } from "./imports.server";

const primeVideo = fileImportProvider({
  id: "prime-video",
  name: "Prime Video",
  imports: PRIME_VIDEO_IMPORTS,
});

export { primeVideo };
