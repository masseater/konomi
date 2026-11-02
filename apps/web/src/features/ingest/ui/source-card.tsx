import { Match } from "effect";
import type { ReactNode } from "react";

import type { SourceState } from "#/features/ingest/api/routes.server";
import { SOURCE_GUIDES, STATUS_LABELS } from "#/features/ingest/model/source-guide";

import { KindTotals } from "./kind-totals";
import { SecretForm } from "./secret-form";

const SourceCard = ({ state }: Readonly<{ state: SourceState }>): ReactNode => {
  const guide = SOURCE_GUIDES[state.source];
  const { connection } = state;
  const failure = Match.value(connection).pipe(
    Match.when({ status: "unconnected" }, () => ""),
    Match.orElse(({ failure: message }) => message),
  );
  return (
    <article className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-lg font-bold">{guide.name}</h2>
      <p className="text-sm">{STATUS_LABELS[connection.status]}</p>
      {failure !== "" && <p className="text-destructive text-sm">{failure}</p>}
      <KindTotals totals={state.totals} />
      <p className="text-muted-foreground text-sm">{guide.howTo}</p>
      <SecretForm source={state.source} label={guide.secretLabel} />
    </article>
  );
};

export { SourceCard };
