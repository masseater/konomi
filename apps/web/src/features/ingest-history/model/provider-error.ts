import type { CredentialRejected } from "./credential-rejected.ts";
import type { ProviderUnavailable } from "./provider-unavailable.ts";

export type ProviderError = CredentialRejected | ProviderUnavailable;
