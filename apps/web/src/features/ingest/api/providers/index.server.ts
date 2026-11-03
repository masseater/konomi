import type { Provider } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

import { HOBBY_PROVIDERS } from "./hobby.server";
import { MUSIC_PROVIDERS } from "./music.server";
import { READING_PROVIDERS } from "./reading.server";
import { SOCIAL_PROVIDERS } from "./social.server";
import { VIDEO_PROVIDERS } from "./video.server";
import { WEB_PROVIDERS } from "./web.server";

const PROVIDERS: Readonly<Record<ProviderId, Provider>> = {
  ...HOBBY_PROVIDERS,
  ...MUSIC_PROVIDERS,
  ...READING_PROVIDERS,
  ...SOCIAL_PROVIDERS,
  ...VIDEO_PROVIDERS,
  ...WEB_PROVIDERS,
};

export { PROVIDERS };
