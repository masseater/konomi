import { Array as Arr, Effect, Match, Record, Schema, pipe } from "effect";
import type { ReactNode } from "react";

import { connectionClient } from "#/features/ingest/api/queries";
import type { CredentialMethod } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";
import { Button } from "#/shared/ui/button";
import { Input } from "#/shared/ui/input";

import { MethodLinks } from "./method-links";
import { useConnectionForm } from "./use-connection-form";

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

const CredentialForm = ({
  provider,
  method,
  redirectUri,
}: Readonly<{
  provider: ProviderId;
  method: CredentialMethod;
  redirectUri: string;
}>): ReactNode => {
  const { submit, status } = useConnectionForm(saveCredential({ provider, method: method.id }));
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
