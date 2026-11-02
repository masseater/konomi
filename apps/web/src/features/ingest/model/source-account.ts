import type { sourceAccount } from "./source-account.table";

type SourceAccount = Readonly<typeof sourceAccount.$inferSelect>;

export type { SourceAccount };
