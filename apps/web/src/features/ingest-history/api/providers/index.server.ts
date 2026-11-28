import { Option, pipe } from "effect";

import { methodOf } from "#/features/ingest-history/model/provider";
import type { Provider } from "#/features/ingest-history/model/provider";
import type { ProviderId } from "#/shared/config";

import { HOBBY_PROVIDERS } from "./hobby.server.ts";
import { MUSIC_PROVIDERS } from "./music.server.ts";
import { READING_PROVIDERS } from "./reading.server.ts";
import { SOCIAL_PROVIDERS } from "./social.server.ts";
import { VIDEO_PROVIDERS } from "./video.server.ts";
import { WEB_PROVIDERS } from "./web.server.ts";

export const PROVIDERS: Readonly<Record<ProviderId, Provider>> = {
  ...HOBBY_PROVIDERS,
  ...MUSIC_PROVIDERS,
  ...READING_PROVIDERS,
  ...SOCIAL_PROVIDERS,
  ...VIDEO_PROVIDERS,
  ...WEB_PROVIDERS,
};

export const knowsMethod =
  (method: string) =>
  (provider: ProviderId): boolean =>
    Option.isSome(pipe(PROVIDERS[provider], methodOf(method)));
