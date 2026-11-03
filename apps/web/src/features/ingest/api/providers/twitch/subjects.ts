import type { SubjectInput } from "#/entities/signal";

import { WEB } from "./api";
import type { TwitchFollowed } from "./schemas";

const channelOf = (followed: TwitchFollowed): SubjectInput => ({
  provider: "twitch",
  externalId: followed.broadcaster_id,
  type: "channel",
  title: followed.broadcaster_name,
  url: `${WEB}/${followed.broadcaster_login}`,
  credits: [],
  tags: [],
});

export { channelOf };
