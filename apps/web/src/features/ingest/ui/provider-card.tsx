import { Array as Arr, Match, pipe } from "effect";
import type { ReactNode } from "react";

import type { ProviderState } from "#/features/ingest/api/routes.server";
import { STATUS_LABELS } from "#/features/ingest/model/labels";

import { CredentialForm } from "./credential-form";
import { ImportForm } from "./import-form";
import { KindTotals } from "./kind-totals";

const ProviderCard = ({ state }: Readonly<{ state: ProviderState }>): ReactNode => {
  const { connection } = state;
  const failure = Match.value(connection).pipe(
    Match.when({ status: "unconnected" }, () => ""),
    Match.orElse(({ failure: message }) => message),
  );
  return (
    <article className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-lg font-bold">{state.name}</h2>
      {Arr.isReadonlyArrayNonEmpty(state.methods) && (
        <p className="text-sm">{STATUS_LABELS[connection.status]}</p>
      )}
      {failure !== "" && <p className="text-destructive text-sm">{failure}</p>}
      <KindTotals totals={state.totals} />
      {pipe(
        state.methods,
        Arr.map((method) => (
          <CredentialForm
            key={method.id}
            provider={state.provider}
            method={method}
            redirectUri={state.redirectUri}
          />
        )),
      )}
      {pipe(
        state.imports,
        Arr.map((format) => (
          <ImportForm key={format.id} provider={state.provider} format={format} />
        )),
      )}
    </article>
  );
};

export { ProviderCard };
