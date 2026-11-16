import { Schema } from "effect";

const Topics = Schema.optional(Schema.NullOr(Schema.Array(Schema.String)));

const Repository = Schema.Struct({
  id: Schema.Int,
  full_name: Schema.String,
  html_url: Schema.String,
  language: Schema.optional(Schema.NullOr(Schema.String)),
  topics: Topics,
  owner: Schema.Struct({ login: Schema.String, id: Schema.Int, html_url: Schema.String }),
});

const Star = Schema.Struct({ starred_at: Schema.String, repo: Repository });

const Stars = Schema.Array(Star);

const Account = Schema.Struct({ login: Schema.String, id: Schema.Int, html_url: Schema.String });

const Accounts = Schema.Array(Account);

type GitHubStar = typeof Star.Type;

type GitHubAccount = typeof Account.Type;

export type { GitHubAccount, GitHubStar };
export { Accounts, Stars };
