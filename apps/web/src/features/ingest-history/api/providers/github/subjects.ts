import { Option, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import {
  epochOr,
  observationsOf,
  followedCreatorsAt,
} from "#/features/ingest-history/api/providers/observe";

import type { GitHubAccount, GitHubStar } from "./schemas";

const accountOf = (account: GitHubAccount): CreatorInput => ({
  provider: "github",
  externalId: String(account.id),
  type: "person",
  title: account.login,
  url: account.html_url,
});

const repositoryOf = ({ repo }: GitHubStar): SubjectInput => ({
  provider: "github",
  externalId: String(repo.id),
  type: "repository",
  title: repo.full_name,
  url: repo.html_url,
  credits: [accountOf(repo.owner)],
  tags: [
    ...Option.toArray(Option.fromNullishOr(repo.language)),
    ...pipe(
      Option.fromNullishOr(repo.topics),
      Option.getOrElse((): readonly string[] => []),
    ),
  ],
});

export const starObservationsOf =
  (fetchedAt: number) =>
  (stars: readonly GitHubStar[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return observationsOf("endorsed")({
      subjectOf: repositoryOf,
      occurredAtOf: (star) => at(star.starred_at),
    })(stars);
  };

export const followObservationsOf = followedCreatorsAt(accountOf);
