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

const Statuses = Schema.Array(Status);

const Accounts = Schema.Array(Account);

const Verified = Schema.Struct({ id: Schema.String });

type MastodonAccount = typeof Account.Type;

type MastodonStatus = typeof Status.Type;

type MastodonTag = typeof Tag.Type;

export type { MastodonAccount, MastodonStatus, MastodonTag };
export { Accounts, Statuses, Verified };
