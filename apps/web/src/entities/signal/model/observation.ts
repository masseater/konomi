import type { ProviderId, SignalKind, SubjectType } from "#/shared/config";

export type CreatorInput = Readonly<{
  provider: ProviderId;
  externalId: string;
  type: SubjectType;
  title: string;
  url: string;
  durationSec?: number;
  publishedAtMs?: number;
}>;

export type SubjectInput = CreatorInput &
  Readonly<{ credits: readonly CreatorInput[]; tags: readonly string[] }>;

export type Observation = Readonly<{
  kind: SignalKind;
  subject: SubjectInput;
  occurredAtMs: number;
  context?: string;
}>;

export type ListingKind = Extract<SignalKind, "endorsed" | "collected">;
