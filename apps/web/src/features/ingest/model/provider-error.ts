import type { CredentialRejected } from "./credential-rejected";
import type { ProviderUnavailable } from "./provider-unavailable";

type ProviderError = CredentialRejected | ProviderUnavailable;

export type { ProviderError };
