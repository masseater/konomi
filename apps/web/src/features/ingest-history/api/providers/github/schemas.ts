import { Schema } from "effect";

const Topics = Schema.String.pipe(Schema.Array, Schema.NullOr, Schema.optional);

const Repository = Schema.Struct({
  id: Schema.Int,
  full_name: Schema.String,
  html_url: Schema.String,
  language: Schema.String.pipe(Schema.NullOr, Schema.optional),
  topics: Topics,
  owner: Schema.Struct({ login: Schema.String, id: Schema.Int, html_url: Schema.String }),
});

const Star = Schema.Struct({ starred_at: Schema.String, repo: Repository });

export const Stars = Schema.Array(Star);

const Account = Schema.Struct({ login: Schema.String, id: Schema.Int, html_url: Schema.String });

export const Accounts = Schema.Array(Account);

export type GitHubStar = typeof Star.Type;

export type GitHubAccount = typeof Account.Type;
