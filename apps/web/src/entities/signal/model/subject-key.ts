import type { ProviderId, SubjectType } from "#/shared/config";

const subjectKeyOf = ({
  provider,
  type,
  externalId,
}: Readonly<{ provider: ProviderId; type: SubjectType; externalId: string }>): string =>
  `${provider}:${type}:${externalId}`;

export { subjectKeyOf };
