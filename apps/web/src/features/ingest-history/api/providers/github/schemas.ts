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

export const Stars = Schema.Array(Star);

const Account = Schema.Struct({ login: Schema.String, id: Schema.Int, html_url: Schema.String });

export const Accounts = Schema.Array(Account);

export type GitHubStar = typeof Star.Type;

export type GitHubAccount = typeof Account.Type;
