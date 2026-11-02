import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Effect, Record, Schema } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { sourceClient, sourceQueries } from "#/features/ingest/api/queries";
import type { SourceId } from "#/shared/config";
import { Button } from "#/shared/ui/button";
import { Input } from "#/shared/ui/input";

const SAVE = "保存する";
const SAVED = "保存した。次の取り込みで使う";
const FAILED = "保存できなかった";

const SecretField = Schema.Struct({ secret: Schema.NonEmptyString });

const saveSecret =
  (source: SourceId) =>
  (form: Readonly<FormData>): Promise<unknown> =>
    Effect.runPromise(
      Schema.decodeUnknownEffect(SecretField)(Record.fromEntries(form)).pipe(
        Effect.flatMap((body) =>
          Effect.promise(() => sourceClient.api.sources({ source }).put(body)),
        ),
      ),
    );

const SecretForm = ({
  source,
  label,
}: Readonly<{ source: SourceId; label: string }>): ReactNode => {
  const queryClient = useQueryClient();
  const { mutate, status } = useMutation({
    mutationFn: saveSecret(source),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: sourceQueries.api.sources.get.queryKey() }),
  });
  const submit = useCallback(
    (form: Readonly<FormData>) => {
      mutate(form);
    },
    [mutate],
  );
  return (
    <form className="flex flex-col gap-2" action={submit}>
      <Input type="password" name="secret" aria-label={label} placeholder={label} required />
      <Button type="submit" disabled={status === "pending"}>
        {SAVE}
      </Button>
      {status === "success" && <p className="text-sm">{SAVED}</p>}
      {status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {FAILED}
        </p>
      )}
    </form>
  );
};

export { SecretForm };
