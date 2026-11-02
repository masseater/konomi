const SOURCE_IDS = ["niconico"] as const;

const ACTIVITY_KINDS = ["watched", "liked", "saved", "followed"] as const;

type SourceId = (typeof SOURCE_IDS)[number];

type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type { ActivityKind, SourceId };
export { ACTIVITY_KINDS, SOURCE_IDS };
