import { COMMON_HTML, EntityDecoder } from "@nodable/entities";
import { Effect, Option, Schema, pipe } from "effect";
import { XMLParser } from "fast-xml-parser";

import { fetchText } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import type { ProviderError } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

const ITEM = "item";

const parser = new XMLParser({
  ignoreAttributes: false,
  entityDecoder: new EntityDecoder({ namedEntities: COMMON_HTML }),
  parseTagValue: false,
  isArray: (name): boolean => name === ITEM,
});

const fetchFeed = <Feed>({
  url,
  headers,
  schema,
}: Readonly<{
  url: string;
  headers: Headers;
  schema: Schema.Decoder<Feed>;
}>): Effect.Effect<Feed, ProviderError> =>
  fetchText({ url, headers }).pipe(
    Effect.flatMap((xml) =>
      Effect.try({
        try: (): unknown => parser.parse(xml),
        catch: () => ProviderUnavailable.make({ message: `${url} was not XML` }),
      }),
    ),
    Effect.flatMap((parsed) =>
      Schema.decodeUnknownEffect(schema)(parsed).pipe(
        Effect.mapError(() => ProviderUnavailable.make({ message: `${url} changed its feed` })),
      ),
    ),
  );

const itemsOf = <Item>(items: readonly Item[] | undefined): readonly Item[] =>
  pipe(
    Option.fromUndefinedOr(items),
    Option.getOrElse((): readonly Item[] => []),
  );

export { fetchFeed, itemsOf };
