import { Option } from "effect";

import type { Credential } from "#/entities/connection";
import { fieldOf } from "#/features/ingest/api/providers/credential-field";
import type { Headers } from "#/features/ingest/api/providers/http.server";

import { FIELD } from "./api";

const authorizationOf = (token: Option.Option<string>): Headers =>
  Option.match(token, {
    onNone: () => ({}),
    onSome: (value) => ({ Authorization: `Bearer ${value}` }),
  });

const headersOf = (credential: Credential): Headers => ({
  Accept: "application/vnd.github.star+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...authorizationOf(fieldOf(credential, FIELD.token)),
});

export { headersOf };
