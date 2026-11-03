import { Option } from "effect";

import type { SubjectInput } from "#/entities/signal";
import type { ProviderId } from "#/shared/config";

type TitledWork = Readonly<{
  provider: ProviderId;
  title: string;
  series: Option.Option<string>;
  searchUrlOf: (query: string) => string;
}>;

const titleSubjectOf = ({ provider, title, series, searchUrlOf }: TitledWork): SubjectInput =>
  Option.match(series, {
    onNone: () => ({
      provider,
      externalId: `title:${title}`,
      type: "video" as const,
      title,
      url: searchUrlOf(title),
      credits: [],
      tags: [],
    }),
    onSome: (name) => ({
      provider,
      externalId: `title:${title}`,
      type: "episode" as const,
      title,
      url: searchUrlOf(name),
      credits: [],
      tags: [name],
    }),
  });

export type { TitledWork };
export { titleSubjectOf };
