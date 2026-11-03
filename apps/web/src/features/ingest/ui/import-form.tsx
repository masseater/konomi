import { Array as Arr, Match, Option, Predicate, Record, pipe } from "effect";
import type { ReactNode } from "react";

import { importFile } from "#/features/ingest/api/import-file";
import type { ImportOutcome } from "#/features/ingest/api/import-file";
import type { ImportView } from "#/features/ingest/api/routes.server";
import type { ProviderId } from "#/shared/config";
import { Button } from "#/shared/ui/button";
import { Input } from "#/shared/ui/input";

import { useConnectionForm } from "./use-connection-form";

const FILE_FIELD = "file";
const IMPORT = "取り込む";
const FAILED = "取り込めなかった";

const NO_FILE: ImportOutcome = { status: "rejected", message: FAILED };

const isFile = (value: Readonly<FormDataEntryValue>): value is File => !Predicate.isString(value);

const fileOf = (form: Readonly<FormData>): Option.Option<File> =>
  pipe(Option.fromNullishOr(form.get(FILE_FIELD)), Option.filter(isFile));

const fieldsOf = (form: Readonly<FormData>): Readonly<Record<string, string>> =>
  pipe(Record.fromEntries(form), Record.filter(Predicate.isString));

const importForm =
  ({ provider, format }: Readonly<{ provider: ProviderId; format: string }>) =>
  (form: Readonly<FormData>): Promise<ImportOutcome> =>
    Option.match(fileOf(form), {
      onNone: () => Promise.resolve(NO_FILE),
      onSome: (file) => importFile({ provider, format, fields: fieldsOf(form), file }),
    });

const outcomeText = (outcome: ImportOutcome): string =>
  Match.value(outcome).pipe(
    Match.when({ status: "imported" }, ({ recorded }) => `${recorded} 件を取り込んだ`),
    Match.orElse(({ message }) => message),
  );

const ImportForm = ({
  provider,
  format,
}: Readonly<{ provider: ProviderId; format: ImportView }>): ReactNode => {
  const { submit, status, data } = useConnectionForm(importForm({ provider, format: format.id }));
  const outcome = Option.fromUndefinedOr(data);
  return (
    <form className="flex flex-col gap-2" action={submit}>
      <h3 className="font-bold">{format.label}</h3>
      <p className="text-muted-foreground text-sm">{format.howTo}</p>
      <Input
        type="file"
        name={FILE_FIELD}
        accept=".csv,text/csv"
        aria-label={format.label}
        required
      />
      {pipe(
        format.fields,
        Arr.map((field) => (
          <Input
            key={field.name}
            name={field.name}
            aria-label={field.label}
            placeholder={field.label}
            required={!field.optional}
          />
        )),
      )}
      <Button type="submit" disabled={status === "pending"}>
        {IMPORT}
      </Button>
      {Option.isSome(outcome) && <output className="text-sm">{outcomeText(outcome.value)}</output>}
    </form>
  );
};

export { ImportForm };
