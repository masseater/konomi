import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { PRIME_VIDEO_IMPORTS } from "./imports.server";

const primeVideo: Provider = {
  id: "prime-video",
  name: "Prime Video",
  methods: [],
  pull: ({ cursor }) => Effect.succeed({ observations: [], cursor }),
  renew: Effect.succeed,
  imports: PRIME_VIDEO_IMPORTS,
};

export { primeVideo };
