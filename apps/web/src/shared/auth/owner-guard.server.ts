import { run } from "@r_masseater/workers-tracing/effect";
import { Effect } from "effect";

import { db, user } from "#/shared/db/index.server";

const NO_OWNERS = 0;

export const rejectSecondOwner = (): Promise<boolean> =>
  run(Effect.promise(() => db.$count(user)).pipe(Effect.map((owners) => owners === NO_OWNERS)));
