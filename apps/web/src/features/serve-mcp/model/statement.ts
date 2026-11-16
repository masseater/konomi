import { Schema } from "effect";

const StatementSchema = Schema.Struct({
  text: Schema.NonEmptyString.annotate({ description: "好みについての 1 文" }),
  subjectKeys: Schema.NonEmptyArray(Schema.NonEmptyString).annotate({
    description: "その文の根拠になった対象の key。taste_profile や search_signals が返したもの",
  }),
});

type Statement = typeof StatementSchema.Type;

export type { Statement };
export { StatementSchema };
