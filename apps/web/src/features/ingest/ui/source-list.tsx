import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { sourceClient, sourceQueries } from "#/features/ingest/api/queries";
import type { SourceState } from "#/features/ingest/api/routes.server";
import { Button } from "#/shared/ui/button";

import { SourceCard } from "./source-card";

const SYNC_NOW = "今すぐ取り込む";
const LOADING = "読み込み中";

const renderCard = (state: SourceState): ReactNode => (
  <SourceCard key={state.source} state={state} />
);

const syncNow = (): Promise<unknown> => sourceClient.api.sources.sync.post();

const SourceList = (): ReactNode => {
  const queryClient = useQueryClient();
  const sources = useQuery(sourceQueries.api.sources.get.queryOptions());
  const { mutate, status } = useMutation({
    mutationFn: syncNow,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: sourceQueries.api.sources.get.queryKey() }),
  });
  const sync = useCallback(() => {
    mutate();
  }, [mutate]);
  if (sources.status !== "success") {
    return <p>{LOADING}</p>;
  }
  return (
    <section className="flex flex-col gap-4">
      {pipe(sources.data, Arr.map(renderCard))}
      <Button variant="outline" disabled={status === "pending"} onClick={sync}>
        {SYNC_NOW}
      </Button>
    </section>
  );
};

export { SourceList };
