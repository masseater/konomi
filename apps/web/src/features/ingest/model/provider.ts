import type { Effect } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import type { ProviderId } from "#/shared/config";

import type { ProviderError } from "./provider-error";

type CredentialField = Readonly<{
  name: string;
  label: string;
  secret: boolean;
  optional: boolean;
}>;

type Discovery = Readonly<{ issuer: string; registration: string; resource: string }>;

type Authorization = Readonly<{
  authorizeUrl: string;
  tokenUrl: string;
  scopes: readonly string[];
  params: Readonly<Record<string, string>>;
  clientAuthentication?: "basic" | "body";
  discovery?: Discovery;
}>;

type CredentialMethod = Readonly<{
  id: string;
  label: string;
  howTo: string;
  fields: readonly CredentialField[];
  renews: boolean;
  authorization?: Authorization;
  authorizePath?: string;
}>;

type PullInput = Readonly<{ credential: Credential; cursor: string }>;

type Pulled = Readonly<{
  observations: readonly Observation[];
  cursor: string;
  credential?: Credential;
}>;

type Provider = Readonly<{
  id: ProviderId;
  name: string;
  methods: readonly CredentialMethod[];
  pull: (input: PullInput) => Effect.Effect<Pulled, ProviderError>;
  renew: (credential: Credential) => Effect.Effect<Credential, ProviderError>;
}>;

export type { ProviderError } from "./provider-error";
export type {
  Authorization,
  CredentialField,
  Discovery,
  CredentialMethod,
  Provider,
  PullInput,
  Pulled,
};
