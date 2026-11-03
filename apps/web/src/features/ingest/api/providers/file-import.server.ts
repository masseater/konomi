import { Effect, Schema } from "effect";

import type { Observation } from "#/entities/signal";
import { ImportRejected } from "#/features/ingest/model/import-rejected";
import type {
  CredentialField,
  ImportFormat,
  ImportInput,
  Provider,
} from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

type DecodedInput<Row> = Readonly<{
  rows: readonly Row[];
  fields: ImportInput["fields"];
}>;

type FileFormat<Row> = Readonly<{
  id: string;
  file: string;
  label: string;
  howTo: string;
  fields: readonly CredentialField[];
  row: Schema.Decoder<Row>;
  observe: (input: DecodedInput<Row>) => Effect.Effect<readonly Observation[], ImportRejected>;
}>;

const rejectImport = (message: string): ImportRejected => ImportRejected.make({ message });

const fileFormat = <Row>({ file, row, observe, ...view }: FileFormat<Row>): ImportFormat => {
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

const fileImportProvider = ({
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

export type { DecodedInput, FileFormat };
export { fileFormat, fileImportProvider, rejectImport };
