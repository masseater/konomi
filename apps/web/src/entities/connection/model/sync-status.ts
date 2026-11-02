const SYNC_STATUSES = ["waiting", "synced", "rejected", "failed"] as const;

const NEVER_SYNCED = 0;

type SyncStatus = (typeof SYNC_STATUSES)[number];

export type { SyncStatus };
export { NEVER_SYNCED, SYNC_STATUSES };
