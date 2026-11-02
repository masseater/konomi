import type { activity } from "./activity.table";

type Activity = Readonly<typeof activity.$inferSelect>;

type ActivityInput = Readonly<Omit<typeof activity.$inferInsert, "id">>;

export type { Activity, ActivityInput };
