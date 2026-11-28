import type { connection } from "./connection.table.ts";

export type Connection = Readonly<typeof connection.$inferSelect>;

export type ConnectionView = Readonly<Omit<Connection, "sealedCredential" | "cursor">>;
