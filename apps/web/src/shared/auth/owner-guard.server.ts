import { run } from "@r_masseater/workers-tracing/effect";
import { Effect } from "effect";

import { authTables, db } from "#/shared/db/index.server";

const NO_OWNERS = 0;

export const rejectSecondOwner = (): Promise<boolean> =>
  run(
    Effect.promise(() => db.$count(authTables.user)).pipe(
      Effect.map((owners) => owners === NO_OWNERS),
    ),
  );
