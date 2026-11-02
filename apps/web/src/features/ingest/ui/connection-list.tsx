import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { connectionClient, connectionQueries } from "#/features/ingest/api/queries";
import type { ProviderState } from "#/features/ingest/api/routes.server";
import { Button } from "#/shared/ui/button";

import { ProviderCard } from "./provider-card";

const SYNC_NOW = "今すぐ取り込む";
const LOADING = "読み込み中";

const renderCard = (state: ProviderState): ReactNode => (
  <ProviderCard key={state.provider} state={state} />
);

const syncNow = (): Promise<unknown> => connectionClient.api.connections.sync.post();

const ConnectionList = (): ReactNode => {
  const queryClient = useQueryClient();
  const connections = useQuery(connectionQueries.api.connections.get.queryOptions());
  const { mutate, status } = useMutation({
    mutationFn: syncNow,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: connectionQueries.api.connections.get.queryKey() }),
  });
  const sync = useCallback(() => {
    mutate();
  }, [mutate]);
  if (connections.status !== "success") {
    return <p>{LOADING}</p>;
  }
  return (
    <section className="flex flex-col gap-4">
      {pipe(connections.data, Arr.map(renderCard))}
      <Button variant="outline" disabled={status === "pending"} onClick={sync}>
        {SYNC_NOW}
      </Button>
    </section>
  );
};

export { ConnectionList };
