import { Effect, Option, Schema, pipe } from "effect";

import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";
import { ProviderUnavailable } from "#/features/ingest-history/model/provider-unavailable";

import { RESOURCE, TOOL } from "./api.ts";
import type { TIMELINES } from "./api.ts";
import { callTool } from "./mcp.server.ts";
import { Posts } from "./schemas.ts";
import type { TwilogLog } from "./schemas.ts";

const NEXT = 1;
const decodePosts = Schema.decodeEffect(Posts);

export type Timeline = (typeof TIMELINES)[keyof typeof TIMELINES];

export const postsPage = ({
  accessToken,
  timeline,
  page,
}: Readonly<{ accessToken: string; timeline: Timeline; page: number }>): Effect.Effect<
  Page<TwilogLog>,
  ProviderError
> =>
  callTool({
    resource: RESOURCE,
    accessToken,
    name: TOOL,
    args: { timeline_filter: timeline, page },
  }).pipe(
    Effect.flatMap((text) =>
      decodePosts(text).pipe(
        Effect.mapError(() => ProviderUnavailable.make({ message: "twilog の答えの形が変わった" })),
      ),
    ),
    Effect.map(({ logs, meta }) => ({
      items: logs,
      next: pipe(
        Option.liftPredicate(meta, ({ page: current, maxPage }) => current < maxPage),
        Option.map(({ page: current }) => String(current + NEXT)),
      ),
    })),
  );
