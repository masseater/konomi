import { Array as Arr } from "effect";
import type { Effect, Option } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import type { ProviderId } from "#/shared/config";

import type { ImportRejected } from "./import-rejected";
import type { ProviderError } from "./provider-error";

export type CredentialField = Readonly<{
  name: string;
  label: string;
  secret: boolean;
  optional: boolean;
}>;

export type Discovery = Readonly<{ issuer: string; registration: string; resource: string }>;

export type Authorization = Readonly<{
  authorizeUrl: string;
  tokenUrl: string;
  scopes: readonly string[];
  params: Readonly<Record<string, string>>;
  clientAuthentication?: "basic" | "body";
  discovery?: Discovery;
}>;

export type CredentialMethod = Readonly<{
  id: string;
  label: string;
  howTo: string;
  fields: readonly CredentialField[];
  renews: boolean;
  authorization?: Authorization;
  authorizePath?: string;
}>;

export type ImportRow = Readonly<Record<string, string>>;

export type ImportInput = Readonly<{
  rows: readonly ImportRow[];
  fields: Readonly<Record<string, string>>;
}>;

export type ImportFormat = Readonly<{
  id: string;
  label: string;
  howTo: string;
  fields: readonly CredentialField[];
  observe: (input: ImportInput) => Effect.Effect<readonly Observation[], ImportRejected>;
}>;

export type PullInput = Readonly<{ credential: Credential; cursor: string }>;

export type Pulled = Readonly<{
  observations: readonly Observation[];
  cursor: string;
  credential?: Credential;
}>;

export type Provider = Readonly<{
  id: ProviderId;
  name: string;
  methods: readonly CredentialMethod[];
  pull: (input: PullInput) => Effect.Effect<Pulled, ProviderError>;
  renew: (credential: Credential) => Effect.Effect<Credential, ProviderError>;
  imports?: readonly ImportFormat[];
}>;

export const methodOf =
  (id: string) =>
  (provider: Provider): Option.Option<CredentialMethod> =>
    Arr.findFirst(provider.methods, (method) => method.id === id);

export type { ProviderError } from "./provider-error";
