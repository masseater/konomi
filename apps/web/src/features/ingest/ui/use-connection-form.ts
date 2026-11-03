import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MutationStatus } from "@tanstack/react-query";
import { useCallback } from "react";

import { connectionQueries } from "#/features/ingest/api/queries";

type ConnectionForm<Result> = Readonly<{
  submit: (form: Readonly<FormData>) => void;
  status: MutationStatus;
  data: Result | undefined;
}>;

const useConnectionForm = <Result>(
  send: (form: Readonly<FormData>) => Promise<Result>,
): ConnectionForm<Result> => {
  const queryClient = useQueryClient();
  const { mutate, status, data } = useMutation({
    mutationFn: send,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: connectionQueries.api.connections.get.queryKey() }),
  });
  const submit = useCallback(
    (form: Readonly<FormData>) => {
      mutate(form);
    },
    [mutate],
  );
  return { submit, status, data };
};

export type { ConnectionForm };
export { useConnectionForm };
