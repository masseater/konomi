import type { ProviderId, SubjectType } from "#/shared/config";

export const subjectKeyOf = ({
  provider,
  type,
  externalId,
}: Readonly<{ provider: ProviderId; type: SubjectType; externalId: string }>): string =>
  `${provider}:${type}:${externalId}`;
