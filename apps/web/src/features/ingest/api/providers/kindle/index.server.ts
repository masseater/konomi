import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { KINDLE_IMPORTS } from "./imports.server";

const kindle: Provider = {
  id: "kindle",
  name: "Kindle",
  methods: [],
  pull: ({ cursor }) => Effect.succeed({ observations: [], cursor }),
  renew: Effect.succeed,
  imports: KINDLE_IMPORTS,
};

export { kindle };
