import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Account = Schema.Struct({
  id: Schema.String,
  acct: Schema.String,
  url: Schema.String,
  display_name: OptionalText,
});

const Tag = Schema.Struct({ name: Schema.String });

const Tags = Schema.optional(Schema.NullOr(Schema.Array(Tag)));

const Status = Schema.Struct({
  id: Schema.String,
  uri: Schema.String,
  url: OptionalText,
  created_at: OptionalText,
  content: OptionalText,
  account: Account,
  tags: Tags,
});

export const Statuses = Schema.Array(Status);

export const Accounts = Schema.Array(Account);

export const Verified = Schema.Struct({ id: Schema.String });

export type MastodonAccount = typeof Account.Type;

export type MastodonStatus = typeof Status.Type;

export type MastodonTag = typeof Tag.Type;
