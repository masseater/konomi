import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, Match, pipe } from "effect";

import type { ActivityInput } from "#/entities/activity/model/activity";
import { activity } from "#/entities/activity/model/activity.table";
import { db } from "#/shared/db/index.server";

const ROWS_PER_BATCH = 50;

const refreshedFields = (row: ActivityInput): Partial<ActivityInput> =>
  Match.value(row.kind).pipe(
    Match.when("followed", () => ({ title: row.title, creator: row.creator, url: row.url })),
    Match.orElse(() => ({
      title: row.title,
      creator: row.creator,
      url: row.url,
      occurredAtMs: row.occurredAtMs,
    })),
  );

const upsertOf = (row: ActivityInput): BatchItem<"sqlite"> =>
  db
    .insert(activity)
    .values(row)
    .onConflictDoUpdate({
      target: [activity.source, activity.kind, activity.itemId],
      set: refreshedFields(row),
    });

const upsertBatch = (rows: Arr.NonEmptyReadonlyArray<ActivityInput>): Effect.Effect<unknown> =>
  Effect.promise(() => db.batch(pipe(rows, Arr.map(upsertOf))));

const recordActivities = (rows: readonly ActivityInput[]): Effect.Effect<number> =>
  Effect.forEach(Arr.chunksOf(rows, ROWS_PER_BATCH), upsertBatch, { discard: true }).pipe(
    Effect.as(rows.length),
    Effect.withSpan("activity.record", { attributes: { rows: rows.length } }),
  );

export { recordActivities };
