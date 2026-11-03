import { Effect } from "effect";

import type { Provider } from "#/features/ingest/model/provider";

import { NETFLIX_IMPORTS } from "./imports.server";

const netflix: Provider = {
  id: "netflix",
  name: "Netflix",
  methods: [],
  pull: ({ cursor }) => Effect.succeed({ observations: [], cursor }),
  renew: Effect.succeed,
  imports: NETFLIX_IMPORTS,
};

export { netflix };
