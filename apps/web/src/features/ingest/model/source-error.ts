import type { CredentialRejected } from "./credential-rejected";
import type { SourceUnavailable } from "./source-unavailable";

type SourceError = CredentialRejected | SourceUnavailable;

export type { SourceError };
