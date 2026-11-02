import type { ProviderId, SignalKind, SubjectType } from "#/shared/config";

type CreatorInput = Readonly<{
  provider: ProviderId;
  externalId: string;
  type: SubjectType;
  title: string;
  url: string;
  durationSec?: number;
  publishedAtMs?: number;
}>;

type SubjectInput = CreatorInput &
  Readonly<{ credits: readonly CreatorInput[]; tags: readonly string[] }>;

type Observation = Readonly<{
  kind: SignalKind;
  subject: SubjectInput;
  occurredAtMs: number;
  context?: string;
}>;

export type { CreatorInput, Observation, SubjectInput };
