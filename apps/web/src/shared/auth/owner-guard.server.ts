import { run } from "@r_masseater/workers-tracing/effect";
import { Effect } from "effect";

import { db } from "#/shared/db/client.server";

import { user } from "./generated/auth.table";

const NO_OWNERS = 0;

const rejectSecondOwner = (): Promise<boolean> =>
  run(Effect.promise(() => db.$count(user)).pipe(Effect.map((owners) => owners === NO_OWNERS)));

export { rejectSecondOwner };
