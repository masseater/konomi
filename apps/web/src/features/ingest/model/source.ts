import type { Effect } from "effect";

import type { ActivityInput } from "#/entities/activity";
import type { SourceId } from "#/shared/config";

import type { SourceError } from "./source-error";

type FetchPlan = Readonly<{ backfill: boolean }>;

type Source = Readonly<{
  id: SourceId;
  collect: (
    secret: string,
    plan: FetchPlan,
  ) => Effect.Effect<readonly ActivityInput[], SourceError>;
}>;

export type { FetchPlan, Source };
