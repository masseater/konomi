import type { connection } from "./connection.table";

type Connection = Readonly<typeof connection.$inferSelect>;

type ConnectionView = Readonly<Omit<Connection, "sealedCredential" | "cursor">>;

export type { Connection, ConnectionView };
