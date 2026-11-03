import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Array as Arr, Effect, Match, Record, Schema, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { connectionClient, connectionQueries } from "#/features/ingest/api/queries";
import type { CredentialMethod } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";
import { Button } from "#/shared/ui/button";
import { Input } from "#/shared/ui/input";

import { MethodLinks } from "./method-links";

const SAVE = "保存する";
const SAVED = "保存した。次の取り込みで使う";
const FAILED = "保存できなかった";

const inputTypeOf = (secret: boolean): string =>
  Match.value(secret).pipe(
    Match.when(true, () => "password"),
    Match.orElse(() => "text"),
  );

const FormFields = Schema.Record(Schema.String, Schema.String);

const saveCredential =
  ({ provider, method }: Readonly<{ provider: ProviderId; method: string }>) =>
  (form: Readonly<FormData>): Promise<unknown> =>
    Effect.runPromise(
      Schema.decodeUnknownEffect(FormFields)(Record.fromEntries(form)).pipe(
        Effect.flatMap((fields) =>
          Effect.promise(() =>
            connectionClient.api.connections({ provider }).put({ method, fields }),
          ),
        ),
      ),
    );

const useSaveCredential = (
  target: Readonly<{ provider: ProviderId; method: string }>,
): Readonly<{ submit: (form: Readonly<FormData>) => void; status: string }> => {
  const queryClient = useQueryClient();
  const { mutate, status } = useMutation({
    mutationFn: saveCredential(target),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: connectionQueries.api.connections.get.queryKey() }),
  });
  const submit = useCallback(
    (form: Readonly<FormData>) => {
      mutate(form);
    },
    [mutate],
  );
  return { submit, status };
};

const CredentialForm = ({
  provider,
  method,
  redirectUri,
}: Readonly<{
  provider: ProviderId;
  method: CredentialMethod;
  redirectUri: string;
}>): ReactNode => {
  const { submit, status } = useSaveCredential({ provider, method: method.id });
  return (
    <form className="flex flex-col gap-2" action={submit}>
      <h3 className="font-bold">{method.label}</h3>
      <p className="text-muted-foreground text-sm">{method.howTo}</p>
      {pipe(
        method.fields,
        Arr.map((field) => (
          <Input
            key={field.name}
            type={inputTypeOf(field.secret)}
            name={field.name}
            aria-label={field.label}
            placeholder={field.label}
            required={!field.optional}
          />
        )),
      )}
      <Button type="submit" disabled={status === "pending"}>
        {SAVE}
      </Button>
      {status === "success" && <p className="text-sm">{SAVED}</p>}
      <MethodLinks provider={provider} method={method} redirectUri={redirectUri} />
      {status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {FAILED}
        </p>
      )}
    </form>
  );
};

export { CredentialForm };
