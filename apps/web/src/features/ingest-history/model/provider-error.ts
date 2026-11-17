import type { CredentialRejected } from "./credential-rejected";
import type { ProviderUnavailable } from "./provider-unavailable";

export type ProviderError = CredentialRejected | ProviderUnavailable;
