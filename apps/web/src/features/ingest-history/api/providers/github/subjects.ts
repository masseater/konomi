import { Option } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personIn } from "#/features/ingest-history/api/providers/creator-input";
import {
  followedCreatorsAt,
  stampedObservationsOf,
} from "#/features/ingest-history/api/providers/observe";
import { orEmpty, subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import type { GitHubAccount, GitHubStar } from "./schemas.ts";

const accountOf = (account: GitHubAccount): CreatorInput =>
  personIn("github")({
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

export const starObservationsOf = stampedObservationsOf("endorsed")({
  subjectOf: repositoryOf,
  dateOf: ({ starred_at: starredAt }) => starredAt,
});

export const followObservationsOf = followedCreatorsAt(accountOf);
