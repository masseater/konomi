import { Effect, Schema } from "effect";

import type { Observation } from "#/entities/signal";
import { ImportRejected } from "#/features/ingest-history/model/import-rejected";
import type {
  CredentialField,
  ImportFormat,
  ImportInput,
  Provider,
} from "#/features/ingest-history/model/provider";
import type { ProviderId } from "#/shared/config";

export type DecodedInput<Row> = Readonly<{
  rows: readonly Row[];
  fields: ImportInput["fields"];
}>;

export type FileFormat<Row> = Readonly<{
  id: string;
  file: string;
  label: string;
  howTo: string;
  fields: readonly CredentialField[];
  row: Schema.Decoder<Row>;
  observe: (input: DecodedInput<Row>) => Effect.Effect<readonly Observation[], ImportRejected>;
}>;

export const rejectImport = (message: string): ImportRejected => ImportRejected.make({ message });

export const fileFormat = <Row>({ file, row, observe, ...view }: FileFormat<Row>): ImportFormat => {
  const decode = Schema.decodeUnknownEffect(Schema.Array(row));
  return {
    ...view,
    label: `${view.label} ${file}`,
    observe: ({ rows, fields }) =>
      decode(rows).pipe(
        Effect.mapError(() => rejectImport(`${file} の列が見つからない。ファイルを確かめる`)),
        Effect.flatMap((decoded) => observe({ rows: decoded, fields })),
      ),
  };
};

export const fileImportProvider = ({
  id,
  name,
  imports,
}: Readonly<{ id: ProviderId; name: string; imports: readonly ImportFormat[] }>): Provider => ({
  id,
  name,
  methods: [],
  pull: ({ cursor }) => Effect.succeed({ observations: [], cursor }),
  renew: Effect.succeed,
  imports,
});
