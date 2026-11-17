import type { connection } from "./connection.table";

export type Connection = Readonly<typeof connection.$inferSelect>;

export type ConnectionView = Readonly<Omit<Connection, "sealedCredential" | "cursor">>;
