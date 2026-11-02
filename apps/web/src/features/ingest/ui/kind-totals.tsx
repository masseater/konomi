import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { SIGNAL_LABELS } from "#/features/ingest/model/labels";
import type { SignalKind } from "#/shared/config";

const KindTotals = ({
  totals,
}: Readonly<{ totals: readonly Readonly<{ kind: SignalKind; signals: number }>[] }>): ReactNode => (
  <ul className="flex gap-3 text-sm">
    {pipe(
      totals,
      Arr.map(({ kind, signals }) => (
        <li key={kind}>
          {SIGNAL_LABELS[kind]} {signals}
        </li>
      )),
    )}
  </ul>
);

export { KindTotals };
