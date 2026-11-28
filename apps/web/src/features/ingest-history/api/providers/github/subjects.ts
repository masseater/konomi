import { Option, Function as Fn } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorIn } from "#/features/ingest-history/api/providers/creator-input";
import {
  followedCreatorsAt,
  datedObservationsOf,
} from "#/features/ingest-history/api/providers/observe";
import { orEmpty, subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { GitHubAccount, GitHubStar } from "./schemas.ts";

const accountOf = (account: GitHubAccount): CreatorInput =>
  creatorIn("github")({
    externalId: String(account.id),
    title: account.login,
    url: account.html_url,
  });

const repositoryOf = ({ repo }: GitHubStar): SubjectInput =>
  subjectIn("github")({
    externalId: String(repo.id),
    type: "repository",
    title: repo.full_name,
    url: repo.html_url,
    credits: [accountOf(repo.owner)],
    tags: [...Option.toArray(Option.fromNullishOr(repo.language)), ...orEmpty(repo.topics)],
  });

export const starObservationsOf = datedObservationsOf({
  kind: "endorsed",
  subjectOf: Fn.flow(repositoryOf, Option.some),
  occurredAtOf: ({ starred_at: starredAt }: GitHubStar) => starredAt,
});

export const followObservationsOf = followedCreatorsAt(accountOf);
