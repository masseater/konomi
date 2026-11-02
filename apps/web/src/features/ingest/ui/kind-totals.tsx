import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { ActivityKind } from "#/shared/config";

const KIND_LABELS: Readonly<Record<ActivityKind, string>> = {
  watched: "視聴",
  liked: "高評価",
  saved: "保存",
  followed: "フォロー",
};

const KindTotals = ({
  totals,
}: Readonly<{ totals: readonly Readonly<{ kind: ActivityKind; items: number }>[] }>): ReactNode => (
  <ul className="flex gap-3 text-sm">
    {pipe(
      totals,
      Arr.map(({ kind, items }) => (
        <li key={kind}>
          {KIND_LABELS[kind]} {items}
        </li>
      )),
    )}
  </ul>
);

export { KindTotals };
