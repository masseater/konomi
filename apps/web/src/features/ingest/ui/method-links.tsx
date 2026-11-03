import { Option } from "effect";
import type { ReactNode } from "react";

import type { CredentialMethod } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

import { AuthorizeLink } from "./authorize-link";
import { AuthorizePageLink } from "./authorize-page-link";

const MethodLinks = ({
  provider,
  method,
  redirectUri,
}: Readonly<{
  provider: ProviderId;
  method: CredentialMethod;
  redirectUri: string;
}>): ReactNode => (
  <>
    {Option.isSome(Option.fromUndefinedOr(method.authorization)) && (
      <AuthorizeLink provider={provider} redirectUri={redirectUri} />
    )}
    {Option.isSome(Option.fromUndefinedOr(method.authorizePath)) && (
      <AuthorizePageLink path={method.authorizePath ?? ""} />
    )}
  </>
);

export { MethodLinks };
