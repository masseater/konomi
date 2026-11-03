import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";

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

const starObservationsOf =
  (fetchedAt: number) =>
  (stars: readonly GitHubStar[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      stars,
      Arr.map((star): Observation => ({
        kind: "endorsed",
        subject: repositoryOf(star),
        occurredAtMs: at(star.starred_at),
      })),
    );
  };

const followObservationsOf =
  (fetchedAt: number) =>
  (accounts: readonly GitHubAccount[]): readonly Observation[] =>
    pipe(
      accounts,
      Arr.map((account): Observation => ({
        kind: "followed",
        subject: { ...accountOf(account), credits: [], tags: [] },
        occurredAtMs: fetchedAt,
      })),
    );

export { followObservationsOf, repositoryOf, starObservationsOf };
