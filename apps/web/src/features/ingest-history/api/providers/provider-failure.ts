import { Match } from "effect";

import { CredentialRejected } from "#/features/ingest-history/model/credential-rejected";
import type { ProviderError } from "#/features/ingest-history/model/provider";
import { ProviderUnavailable } from "#/features/ingest-history/model/provider-unavailable";

export const failureWhen =
  (rejects: (cause: unknown) => boolean) =>
  ({ rejected, failed }: Readonly<{ rejected: string; failed: string }>) =>
  (cause: unknown): ProviderError =>
    Match.value(cause).pipe(
      Match.when(rejects, () => CredentialRejected.make({ message: rejected })),
      Match.orElse(() => ProviderUnavailable.make({ message: `${failed}: ${String(cause)}` })),
    );
