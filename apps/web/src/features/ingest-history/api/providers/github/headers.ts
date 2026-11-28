import type { Credential } from "#/entities/connection";
import {
  fieldOf,
  optionalBearerOf,
} from "#/features/ingest-history/api/providers/credential-field";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";

import { FIELD } from "./api";

export const headersOf = (credential: Credential): Headers => ({
  Accept: "application/vnd.github.star+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...optionalBearerOf(fieldOf(credential, FIELD.token)),
});
