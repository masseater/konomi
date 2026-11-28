import { Effect } from "effect";

import { bearerHeadersOf } from "#/features/ingest-history/api/providers/oauth.server";
import type { Fetching } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { pullFollowed, pullRecent, pullSaved } from "./library.server.ts";
import { pullPlaylists } from "./playlists.server.ts";

export const pullSpotify = pullOf({
  provider: "spotify",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* spotify() {
      const fetching: Fetching = {
        headers: yield* bearerHeadersOf(credential),
        fetchedAt,
      };
      const observations = [
        ...(yield* pullRecent(fetching)),
        ...(yield* pullSaved({ ...fetching, pages })),
        ...(yield* pullFollowed({ ...fetching, pages })),
        ...(yield* pullPlaylists(fetching)),
      ];
      return observations;
    }),
});
