import { Array as Arr, Match, Option, Schema, pipe } from "effect";

import { nodesNamed, valuesNamed } from "#/features/ingest/api/providers/json-walk";
import type { Named } from "#/features/ingest/api/providers/json-walk";

import { channelOf, clockSecondsOf } from "./subjects";
import type { VideoParts } from "./subjects";

const VIDEO_LOCKUP = "LOCKUP_CONTENT_TYPE_VIDEO";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const BrowseEndpoint = Schema.Struct({ browseId: OptionalText });

const Endpoint = Schema.Struct({ browseEndpoint: Schema.optional(BrowseEndpoint) });

const Run = Schema.Struct({ text: Schema.String, navigationEndpoint: Schema.optional(Endpoint) });

const Runs = Schema.Struct({
  runs: Schema.optional(Schema.Array(Run)),
  simpleText: OptionalText,
});

const VideoRenderer = Schema.Struct({
  videoId: Schema.String,
  title: Runs,
  lengthText: Schema.optional(Runs),
  shortBylineText: Schema.optional(Runs),
});

const Content = Schema.Struct({ content: Schema.String });

const LockupMetadata = Schema.Struct({ title: Content });

const LockupMetadataHolder = Schema.Struct({ lockupMetadataViewModel: LockupMetadata });

const Lockup = Schema.Struct({
  contentId: Schema.String,
  contentType: Schema.String,
  metadata: LockupMetadataHolder,
});

const RequiredEndpoint = Schema.Struct({ browseEndpoint: BrowseEndpoint });

const Tap = Schema.Struct({ innertubeCommand: RequiredEndpoint });

const CommandRun = Schema.Struct({ onTap: Tap });

const BrowseCommand = Schema.Struct({
  content: Schema.String,
  commandRuns: Schema.NonEmptyArray(CommandRun),
});

const Badge = Schema.Struct({ text: Schema.String });

const decodeRenderer = Schema.decodeUnknownOption(VideoRenderer);
const decodeLockup = Schema.decodeUnknownOption(Lockup);
const decodeCommand = Schema.decodeUnknownOption(BrowseCommand);
const decodeBadge = Schema.decodeUnknownOption(Badge);

const textOf = (runs: typeof Runs.Type): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(runs.simpleText),
    Option.orElse(() =>
      pipe(
        Option.fromUndefinedOr(runs.runs),
        Option.map(Arr.map(({ text }) => text)),
        Option.map(Arr.join("")),
      ),
    ),
  );

const rendererChannelOf = (byline: typeof Runs.Type | undefined): VideoParts["channel"] =>
  pipe(
    Option.fromUndefinedOr(byline),
    Option.flatMap(({ runs }) => Option.fromUndefinedOr(runs)),
    Option.flatMap(Arr.head),
    Option.flatMap(({ text, navigationEndpoint }) =>
      pipe(
        Option.fromUndefinedOr(navigationEndpoint),
        Option.flatMap(({ browseEndpoint }) => Option.fromUndefinedOr(browseEndpoint)),
        Option.flatMap(({ browseId }) => channelOf({ id: browseId, title: text })),
      ),
    ),
  );

const fromRenderer = (renderer: typeof VideoRenderer.Type): VideoParts => ({
  id: renderer.videoId,
  title: Option.getOrElse(textOf(renderer.title), () => renderer.videoId),
  channel: rendererChannelOf(renderer.shortBylineText),
  durationSec: pipe(
    Option.fromUndefinedOr(renderer.lengthText),
    Option.flatMap(textOf),
    Option.flatMap(clockSecondsOf),
  ),
  publishedAt: Option.none(),
  tags: [],
});

const commandChannelOf = ({
  content,
  commandRuns,
}: typeof BrowseCommand.Type): VideoParts["channel"] =>
  channelOf({
    id: Arr.headNonEmpty(commandRuns).onTap.innertubeCommand.browseEndpoint.browseId,
    title: content,
  });

const lockupChannelOf = (node: unknown): VideoParts["channel"] =>
  pipe(
    valuesNamed(node, "text"),
    Arr.map((text) => decodeCommand(text)),
    Arr.getSomes,
    Arr.map(commandChannelOf),
    Arr.getSomes,
    Arr.head,
  );

const lockupDurationOf = (node: unknown): VideoParts["durationSec"] =>
  pipe(
    valuesNamed(node, "thumbnailBadgeViewModel"),
    Arr.map((badge) => decodeBadge(badge)),
    Arr.getSomes,
    Arr.map(({ text }) => clockSecondsOf(text)),
    Arr.getSomes,
    Arr.head,
  );

const fromLockup = (node: unknown): Option.Option<VideoParts> =>
  pipe(
    decodeLockup(node),
    Option.filter(({ contentType }) => contentType === VIDEO_LOCKUP),
    Option.map((lockup) => ({
      id: lockup.contentId,
      title: lockup.metadata.lockupMetadataViewModel.title.content,
      channel: lockupChannelOf(node),
      durationSec: lockupDurationOf(node),
      publishedAt: Option.none(),
      tags: [],
    })),
  );

const RENDERER = "videoRenderer";
const LOCKUP = "lockupViewModel";

const videoOf = ({ name, value }: Named): Option.Option<VideoParts> =>
  Match.value(name).pipe(
    Match.when(RENDERER, () => Option.map(decodeRenderer(value), fromRenderer)),
    Match.orElse(() => fromLockup(value)),
  );

const historyVideosOf = (page: unknown): readonly VideoParts[] =>
  pipe(
    nodesNamed(page, [RENDERER, LOCKUP]),
    Arr.map(videoOf),
    Arr.getSomes,
    Arr.dedupeWith((left, right) => left.id === right.id),
  );

export { historyVideosOf };
