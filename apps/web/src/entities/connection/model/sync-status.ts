export const SYNC_STATUSES = ["waiting", "synced", "rejected", "failed"] as const;

export const NEVER_SYNCED = 0;

export type SyncStatus = (typeof SYNC_STATUSES)[number];
